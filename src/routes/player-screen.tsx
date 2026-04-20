import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getScreenPlaylistPayload,
  postPlayerHeartbeat,
  postPlayerSyncAck,
  type ScreenPlaylistItem,
} from "@/lib/server/player.functions";
import { getMediaUrlCandidates, applyMediaFallback } from "@/lib/media-url";
import { initAndroidTvShell } from "@/player/capacitor/android-shell";
import { Tv, Wifi, AlertCircle, Loader2 } from "lucide-react";

const LS_CODE = "signix_pairing_code";
const LS_SCREEN = "signix_screen_id";

export const Route = createFileRoute("/player-screen")({
  head: () => ({ meta: [{ title: "Player — Signix" }] }),
  validateSearch: (raw: Record<string, unknown>) => {
    const p = raw.platform;
    const platform = p === "tizen" || p === "android" ? p : undefined;
    return { platform } as { platform?: "android" | "tizen" };
  },
  component: PlayerScreenPage,
});

type PayloadOk = {
  ok: true;
  unchanged?: boolean;
  etag: string;
  server_time: string;
  screen?: { id: string; name: string; organization_id: string };
  campaign?: { id: string; name: string; playlist_id: string; priority: number } | null;
  playlist?: { id: string; name: string } | null;
  items?: ScreenPlaylistItem[];
  source?: string;
};

function PlayerScreenPage() {
  const { platform: platformSearch } = Route.useSearch();
  const platform = platformSearch === "tizen" ? "tizen" : "android";

  const getPayloadFn = useServerFn(getScreenPlaylistPayload);
  const heartbeatFn = useServerFn(postPlayerHeartbeat);
  const syncAckFn = useServerFn(postPlayerSyncAck);

  useEffect(() => {
    void initAndroidTvShell();
  }, []);

  const [screenId, setScreenId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [items, setItems] = useState<ScreenPlaylistItem[]>([]);
  const [campaignLabel, setCampaignLabel] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem(LS_SCREEN);
    const code = localStorage.getItem(LS_CODE);
    setScreenId(sid);
    setPairingCode(code);
    if (!sid || !code) setError("Faça o pareamento primeiro e volte aqui (código e tela gravados neste aparelho).");
  }, []);

  const pullPlaylist = useCallback(async () => {
    if (!screenId || !pairingCode) return;
    setError(null);
    try {
      const res = (await getPayloadFn({
        data: {
          screen_id: screenId,
          pairing_code: pairingCode,
          platform,
          etag: etagRef.current,
        },
      })) as PayloadOk;

      if (!res?.ok) throw new Error("Resposta inválida do servidor.");

      if (res.unchanged) return;

      etagRef.current = res.etag;
      const nextItems = res.items ?? [];
      setItems(nextItems);
      setCampaignLabel(res.campaign?.name ?? "");
      setSource(res.source ?? "");
      setIdx((i) => (nextItems.length === 0 ? 0 : Math.min(i, nextItems.length - 1)));

      await syncAckFn({
        data: {
          screen_id: screenId,
          pairing_code: pairingCode,
          platform,
          sync_type: "playlist_pull",
          sync_status: nextItems.length > 0 ? "success" : "partial",
          items_downloaded: nextItems.length,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao sincronizar.");
      if (screenId && pairingCode) {
        try {
          await syncAckFn({
            data: {
              screen_id: screenId,
              pairing_code: pairingCode,
              platform,
              sync_type: "playlist_pull",
              sync_status: "failed",
              error_message: e instanceof Error ? e.message : String(e),
            },
          });
        } catch {
          /* ignore */
        }
      }
    } finally {
      setInitialSyncDone(true);
    }
  }, [screenId, pairingCode, platform, getPayloadFn, syncAckFn]);

  useEffect(() => {
    if (!screenId || !pairingCode) return;
    void pullPlaylist();
    const t = setInterval(() => void pullPlaylist(), 90_000);
    return () => clearInterval(t);
  }, [screenId, pairingCode, pullPlaylist]);

  useEffect(() => {
    if (!screenId || !pairingCode || items.length === 0) return;
    const cur = items[idx];
    const mime = (cur?.mime_type ?? "").toLowerCase();
    if (mime.includes("video")) return;
    const dur = Math.max(5, (cur?.duration_seconds ?? 8) as number);
    const timer = setInterval(() => setIdx((i) => (i + 1) % items.length), dur * 1000);
    return () => clearInterval(timer);
  }, [items, idx, screenId, pairingCode]);

  useEffect(() => {
    if (!screenId || !pairingCode) return;
    const send = () => {
      const cur = items[idx];
      void heartbeatFn({
        data: {
          screen_id: screenId,
          pairing_code: pairingCode,
          platform,
          player_status: "playing",
          current_media_id: cur?.id ?? null,
        },
      });
    };
    send();
    const h = setInterval(send, 60_000);
    return () => clearInterval(h);
  }, [screenId, pairingCode, platform, items, idx, heartbeatFn]);

  const current = items[idx];
  const urls = current
    ? getMediaUrlCandidates(
        { mediaTypeHint: (current?.mime_type ?? "").toLowerCase().includes("video") ? "video" : "image" },
        current.public_url,
        current.thumbnail_url,
      )
    : [];
  const isVideo = (current?.mime_type ?? "").toLowerCase().includes("video");

  if (screenId && pairingCode && !initialSyncDone) {
    return (
      <div className="min-h-screen w-screen bg-black text-white grid place-items-center">
        <Loader2 className="h-12 w-12 animate-spin text-white/60" aria-label="A sincronizar" />
      </div>
    );
  }

  if (!screenId || !pairingCode) {
    return (
      <div className="min-h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-amber-400" />
        <p className="text-center max-w-md text-sm text-white/80">{error}</p>
        <Link
          to="/pareamento"
          search={{ platform: platform === "tizen" ? "tizen" : undefined }}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          Ir para pareamento
        </Link>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="min-h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive-foreground text-sm">{error}</p>
        <button
          type="button"
          onClick={() => void pullPlaylist()}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen w-screen bg-black text-white grid place-items-center p-8">
        <div className="text-center max-w-lg">
          <Tv className="h-14 w-14 mx-auto text-white/40" />
          <p className="mt-4 text-lg">Sem conteúdo para esta tela</p>
          <p className="mt-2 text-sm text-white/60">
            Crie uma campanha <strong>activa</strong> com alvo nesta tela (ou na sua unidade) e associe uma playlist
            com itens, ou adicione mídias na organização — enquanto não houver itens, usamos mídias activas como
            fallback.
          </p>
          <p className="mt-3 text-xs text-white/40">Origem: {source || "—"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        {isVideo && urls[0] ? (
          <video
            key={current!.id}
            className="w-full h-full object-cover"
            src={urls[0]}
            autoPlay
            muted
            playsInline
            onEnded={() => setIdx((i) => (i + 1) % items.length)}
          />
        ) : (
          <img
            src={urls[0] ?? ""}
            data-sources={JSON.stringify(urls)}
            data-source-index="0"
            alt={current?.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => applyMediaFallback(e.currentTarget)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      <div className="relative flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur px-3 py-1.5 text-xs">
          <Tv className="h-4 w-4" />
          <span className="font-medium">Signix</span>
          <span className="text-white/50">·</span>
          <span className="truncate max-w-[40vw]">{campaignLabel || "Campanha"}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/80">
          <Wifi className="h-3.5 w-3.5" />
          {navigator.onLine ? "Online" : "Offline"}
          <span className="text-white/40">·</span>
          <span className="uppercase">{platform}</span>
        </div>
      </div>

      <div className="relative mt-auto p-4 flex items-center justify-between text-[11px] text-white/50">
        <span>
          {idx + 1}/{items.length} · {source}
        </span>
        <Link to="/pareamento" search={{ platform: platform === "tizen" ? "tizen" : undefined }} className="hover:text-white">
          Re-parear
        </Link>
      </div>
    </div>
  );
}
