import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ActivationScreen } from "@/player/components/activation-screen";
import { AdminOverlay } from "@/player/components/admin-overlay";
import { FallbackScreen } from "@/player/components/fallback-screen";
import { LoadingScreen } from "@/player/components/loading-screen";
import { PlaybackScreen } from "@/player/components/playback-screen";
import { initAndroidTvShell } from "@/player/capacitor/android-shell";
import { usePlayerRuntime } from "@/player/hooks/use-player-runtime";
import { PLAYER_VERSION_LABEL } from "@/player/version";

export const Route = createFileRoute("/player")({
  head: () => ({ meta: [{ title: "Player — Signix" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const {
    stage,
    items,
    currentItem,
    currentMediaUrl,
    credentials,
    settings,
    online,
    isSyncing,
    lastSyncAt,
    lastError,
    adminVisible,
    activateWithCode,
    syncNow,
    onVideoEnded,
    onMediaError,
    updateSettings,
    resetPlayer,
  } = usePlayerRuntime();
  const [pairingLoading, setPairingLoading] = useState(false);

  useEffect(() => {
    void initAndroidTvShell();
  }, []);

  useEffect(() => {
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  if (stage === "activation") {
    return (
      <ActivationScreen
        loading={pairingLoading}
        online={online}
        errorMessage={lastError}
        onActivate={async (code) => {
          setPairingLoading(true);
          try {
            await activateWithCode(code);
          } finally {
            setPairingLoading(false);
          }
        }}
      />
    );
  }

  if (stage === "loading") {
    return (
      <LoadingScreen
        connectionLabel={online ? "Conectado" : "Offline"}
        syncLabel={isSyncing ? "Sincronizando..." : "Aguardando"}
      />
    );
  }

  if (stage === "fallback") {
    return <FallbackScreen message={lastError} onRetry={syncNow} />;
  }

  return (
    <>
      <PlaybackScreen
        credentials={credentials}
        items={items}
        currentItem={currentItem}
        currentMediaUrl={currentMediaUrl}
        onVideoEnded={onVideoEnded}
        onMediaError={onMediaError}
      />
      <AdminOverlay
        visible={adminVisible}
        online={online}
        version={PLAYER_VERSION_LABEL}
        lastSyncAt={lastSyncAt}
        lastError={lastError}
        settings={settings}
        onSettingsChange={updateSettings}
        onSync={syncNow}
        onRestart={resetPlayer}
      />
    </>
  );
}
