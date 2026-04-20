import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PLAYER_SETTINGS } from "@/player/config";
import { useNetworkStatus } from "@/player/hooks/use-network-status";
import { getCachedMediaUrl } from "@/player/services/media-cache";
import { flushQueuedLogs, queuePlaybackLog } from "@/player/services/log-queue";
import { pairScreen, sendHeartbeat } from "@/player/services/player-api";
import { syncPlayerPayload } from "@/player/services/sync-service";
import {
  clearCredentials,
  getCredentials,
  getLastError,
  getSettings,
  setCredentials,
  setLastError,
  setSettings,
} from "@/player/storage/player-local";
import type {
  LocalScreenCredentials,
  PlaybackLog,
  PlayerPayload,
  PlayerRuntimeStage,
  PlayerSettings,
  PlaylistItemPayload,
} from "@/player/types";

function buildFingerprint() {
  const seed = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}|${navigator.platform}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `fp-${Math.abs(hash)}`;
}

function newId() {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function usePlayerRuntime() {
  const online = useNetworkStatus();
  const [stage, setStage] = useState<PlayerRuntimeStage>("loading");
  const [isSyncing, setIsSyncing] = useState(false);
  const [payload, setPayload] = useState<PlayerPayload | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastErrorState] = useState<string | null>(getLastError());
  const [settings, setSettingsState] = useState<PlayerSettings>(getSettings());
  const [credentials, setCredentialsState] = useState<LocalScreenCredentials | null>(null);
  const [adminVisible, setAdminVisible] = useState(false);
  const currentPlaybackRef = useRef<{
    eventId: string;
    startedAt: number;
    item: PlaylistItemPayload;
  } | null>(null);
  const timerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const items = useMemo(() => payload?.items ?? [], [payload]);
  const currentItem = useMemo(() => items[currentIndex] ?? null, [items, currentIndex]);

  const safeSetError = useCallback((message: string | null) => {
    setLastErrorState(message);
    if (message) setLastError(message);
  }, []);

  const nextItem = useCallback(() => {
    setCurrentIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
  }, [items.length]);

  const finalizePlayback = useCallback(
    async (status: PlaybackLog["playbackStatus"], errorMessage?: string) => {
      const active = currentPlaybackRef.current;
      if (!active || !credentials || !payload) return;

      const elapsed = Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000));
      const log: PlaybackLog = {
        id: newId(),
        screenId: credentials.screenId,
        campaignId: payload.campaign_id ?? null,
        playlistId: payload.playlist_id ?? null,
        mediaAssetId: active.item.media_asset_id,
        itemId: active.item.id,
        playbackStatus: status,
        startedAt: new Date(active.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        durationPlayed: elapsed,
        errorMessage,
        localEventId: active.eventId,
      };
      await queuePlaybackLog(log);
      currentPlaybackRef.current = null;
    },
    [credentials, payload],
  );

  const syncNow = useCallback(async () => {
    if (!credentials) return;
    setIsSyncing(true);
    try {
      const result = await syncPlayerPayload(credentials.screenId);
      setPayload(result.payload);
      setCurrentIndex(0);
      setStage(result.payload.items.length > 0 ? "playing" : "fallback");
      setLastSyncAt(new Date().toISOString());
      if (!result.fromCache) {
        safeSetError(null);
      }
    } catch (error) {
      safeSetError(error instanceof Error ? error.message : "Falha de sincronização");
      setStage("fallback");
    } finally {
      setIsSyncing(false);
    }
  }, [credentials, safeSetError]);

  const activateWithCode = useCallback(
    async (code: string) => {
      setStage("loading");
      try {
        const screen = await pairScreen(code, buildFingerprint());
        const creds: LocalScreenCredentials = {
          screenId: screen.screen_id,
          organizationId: screen.organization_id,
          screenName: screen.screen_name,
          fingerprint: buildFingerprint(),
          pairedAt: new Date().toISOString(),
        };
        await setCredentials(creds);
        setCredentialsState(creds);
        safeSetError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha no pareamento";
        safeSetError(message);
        setStage("activation");
      }
    },
    [safeSetError],
  );

  const resetPlayer = useCallback(async () => {
    await clearCredentials();
    setCredentialsState(null);
    setPayload(null);
    setCurrentIndex(0);
    setStage("activation");
  }, []);

  const updateSettings = useCallback((next: PlayerSettings) => {
    setSettingsState(next);
    setSettings(next);
  }, []);

  useEffect(() => {
    getCredentials()
      .then((creds) => {
        setCredentialsState(creds);
        if (!creds) {
          setStage("activation");
          return;
        }
        setStage("loading");
      })
      .catch(() => setStage("activation"));
  }, []);

  useEffect(() => {
    if (!credentials || (stage !== "loading" && stage !== "playing")) return;
    syncNow();
  }, [credentials, stage, syncNow]);

  useEffect(() => {
    if (!credentials) return;
    const heartbeatTimer = window.setInterval(() => {
      sendHeartbeat({
        screenId: credentials.screenId,
        isOk: !lastError,
        errorMessage: lastError,
        networkStatus: online ? "online" : "offline",
      }).catch(() => undefined);
    }, settings.heartbeatSeconds * 1000);

    const syncTimer = window.setInterval(() => {
      syncNow();
    }, settings.syncSeconds * 1000);

    const flushTimer = window.setInterval(() => {
      flushQueuedLogs().catch(() => undefined);
    }, 15000);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(syncTimer);
      window.clearInterval(flushTimer);
    };
  }, [credentials, settings.heartbeatSeconds, settings.syncSeconds, syncNow, online, lastError]);

  useEffect(() => {
    if (!online) return;
    flushQueuedLogs().catch(() => undefined);
  }, [online]);

  useEffect(() => {
    if (!currentItem || !credentials || !payload || stage !== "playing") return;

    const run = async () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      const offlineUrl = await getCachedMediaUrl(currentItem);
      const mediaUrl = offlineUrl ?? currentItem.media_url;
      if (offlineUrl) {
        objectUrlRef.current = offlineUrl;
      }
      setCurrentMediaUrl(mediaUrl);

      const eventId = newId();
      currentPlaybackRef.current = {
        eventId,
        startedAt: Date.now(),
        item: currentItem,
      };

      await queuePlaybackLog({
        id: newId(),
        screenId: credentials.screenId,
        campaignId: payload.campaign_id ?? null,
        playlistId: payload.playlist_id ?? null,
        mediaAssetId: currentItem.media_asset_id,
        itemId: currentItem.id,
        playbackStatus: "started",
        startedAt: new Date().toISOString(),
        localEventId: eventId,
      });

      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);

      const durationMs = Math.max(4, currentItem.duration_seconds || 8) * 1000;
      if (currentItem.media_type !== "video") {
        timerRef.current = window.setTimeout(async () => {
          await finalizePlayback("ended");
          nextItem();
        }, durationMs);
      }
      watchdogRef.current = window.setTimeout(
        async () => {
          await finalizePlayback("failed", "Watchdog de reprodução acionado");
          nextItem();
        },
        Math.max(durationMs * 2, 15000),
      );
    };

    run().catch(async (error) => {
      safeSetError(error instanceof Error ? error.message : "Falha ao iniciar item");
      await finalizePlayback("failed", "Falha ao iniciar item");
      nextItem();
    });
  }, [currentItem, credentials, payload, stage, finalizePlayback, nextItem, safeSetError]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d") {
        setAdminVisible((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onVideoEnded = useCallback(async () => {
    await finalizePlayback("ended");
    nextItem();
  }, [finalizePlayback, nextItem]);

  const onMediaError = useCallback(async () => {
    safeSetError("Falha ao renderizar mídia. Item ignorado.");
    await finalizePlayback("failed", "Falha ao renderizar mídia");
    nextItem();
  }, [finalizePlayback, nextItem, safeSetError]);

  return {
    stage,
    items,
    currentItem,
    currentMediaUrl,
    credentials,
    settings: settings ?? DEFAULT_PLAYER_SETTINGS,
    online,
    isSyncing,
    lastSyncAt,
    lastError,
    adminVisible,
    activateWithCode,
    setStage,
    syncNow,
    onVideoEnded,
    onMediaError,
    updateSettings,
    setAdminVisible,
    resetPlayer,
  };
}
