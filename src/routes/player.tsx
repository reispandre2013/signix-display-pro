import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tv, Maximize2, Volume2, Wifi, Image as ImageIcon } from "lucide-react";
import { applyMediaFallback, getMediaUrlCandidates } from "@/lib/media-url";
import { getScreenContent, heartbeatScreen } from "@/lib/server/player.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/player")({
  head: () => ({ meta: [{ title: "Player — Signix" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const [screenId, setScreenId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(new Date());

  // Pega screen_id salvo no localStorage durante o pareamento
  useEffect(() => {
    const id = localStorage.getItem("signix_screen_id");
    setScreenId(id);
  }, []);

  // Busca mídias + campanhas via server function pública (sem auth)
  const { data, isLoading } = useQuery({
    queryKey: ["screen_content", screenId],
    enabled: !!screenId,
    refetchInterval: 30_000,
    queryFn: () => getScreenContent({ data: { screen_id: screenId! } }),
  });

  const items = data?.media ?? [];
  const activeCampaign = data?.campaign ?? null;

  useEffect(() => {
    if (items.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  useEffect(() => {
    const c = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(c);
  }, []);

  // Heartbeat: avisa o painel que esta TV está online (a cada 30s + ping inicial)
  const heartbeatFn = useServerFn(heartbeatScreen);
  useEffect(() => {
    if (!screenId) return;
    const sendPing = () => {
      const resolution =
        typeof window !== "undefined"
          ? `${window.screen?.width ?? window.innerWidth}x${window.screen?.height ?? window.innerHeight}`
          : null;
      const platform =
        typeof navigator !== "undefined"
          ? navigator.userAgent.slice(0, 64)
          : null;
      heartbeatFn({
        data: {
          screen_id: screenId,
          platform,
          player_version: "web-1.0.0",
          resolution,
          current_campaign_id: data?.campaign?.id ?? null,
        },
      }).catch((e) => console.warn("[heartbeat] falhou:", e));
    };
    sendPing();
    const t = setInterval(sendPing, 30_000);
    return () => clearInterval(t);
  }, [screenId, data?.campaign?.id, heartbeatFn]);


  const current = items[idx];
  const currentSources = current
    ? getMediaUrlCandidates(current.public_url, current.thumbnail_url)
    : [];

  if (!screenId) {
    return (
      <div className="min-h-screen w-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <Tv className="h-16 w-16 mx-auto text-white/30" />
          <p className="mt-4 text-lg">Esta TV ainda não foi pareada</p>
          <Link
            to="/pareamento"
            className="mt-6 inline-block text-primary hover:underline text-sm"
          >
            Iniciar pareamento →
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-black text-white grid place-items-center">
        <p className="text-sm text-white/60">Carregando conteúdo…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen w-screen bg-black text-white grid place-items-center">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto text-white/30" />
          <p className="mt-4 text-lg">Nenhuma mídia disponível para reprodução</p>
          <p className="mt-2 text-xs text-white/40">
            Adicione mídias no painel para esta organização.
          </p>
          <p className="mt-6 text-[10px] text-white/30 font-mono">
            screen_id: {screenId}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={currentSources[0] ?? ""}
          data-sources={JSON.stringify(currentSources)}
          data-source-index="0"
          alt={current.name}
          className="w-full h-full object-cover transition-opacity duration-1000"
          key={`${current.id}-${currentSources[0] ?? "empty"}`}
          referrerPolicy="no-referrer"
          onError={(e) => applyMediaFallback(e.currentTarget)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      <div className="relative flex items-center justify-between p-6">
        <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 ring-1 ring-white/10">
          <Tv className="h-4 w-4 text-white/80" />
          <span className="text-xs font-medium">Signix Player</span>
          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> ONLINE
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/80">
          <span className="inline-flex items-center gap-1">
            <Wifi className="h-3.5 w-3.5" /> {navigator.onLine ? "Online" : "Offline"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Volume2 className="h-3.5 w-3.5" /> 60%
          </span>
          <span className="font-mono">{now.toLocaleTimeString("pt-BR")}</span>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-end p-12 pb-16">
        <div className="max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Campanha em exibição</p>
          <h1 className="mt-3 font-display text-4xl lg:text-6xl font-bold leading-tight">
            {activeCampaign?.name ?? current.name}
          </h1>
          {activeCampaign?.description && (
            <p className="mt-4 text-base lg:text-lg text-white/80 max-w-xl mx-auto">
              {activeCampaign.description}
            </p>
          )}
        </div>
      </div>

      <div className="relative px-6 pb-6">
        <div className="flex items-center gap-2">
          {items.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/15">
              <div
                className="h-full bg-white transition-all duration-[5000ms] ease-linear"
                style={{ width: i === idx ? "100%" : i < idx ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
          <span>
            Item {idx + 1} / {items.length} · {current.name}
          </span>
          <Link to="/app" className="inline-flex items-center gap-1 hover:text-white transition-colors">
            <Maximize2 className="h-3 w-3" /> Sair do modo player
          </Link>
        </div>
      </div>
    </div>
  );
}
