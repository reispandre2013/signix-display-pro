import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tv, Maximize2, Volume2, Wifi } from "lucide-react";
import { mockMedia } from "@/lib/mock-data";

export const Route = createFileRoute("/player")({
  head: () => ({ meta: [{ title: "Player — Signix" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const items = mockMedia.filter((m) => m.type === "imagem" || m.type === "banner").slice(0, 6);
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    const c = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [items.length]);

  const current = items[idx];

  return (
    <div className="min-h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={current.url}
          alt=""
          className="w-full h-full object-cover transition-opacity duration-1000"
          key={current.id}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      <div className="relative flex items-center justify-between p-6">
        <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 ring-1 ring-white/10">
          <Tv className="h-4 w-4 text-white/80" />
          <span className="text-xs font-medium">Signix Player · Tela 04 · Hall Principal</span>
          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> ONLINE
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/80">
          <span className="inline-flex items-center gap-1">
            <Wifi className="h-3.5 w-3.5" /> 87 Mbps
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
            Black Friday 2025
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/80 max-w-xl mx-auto">
            Ofertas exclusivas em todas as unidades. Confira no balcão de atendimento.
          </p>
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
          <Link
            to="/app"
            className="inline-flex items-center gap-1 hover:text-white transition-colors"
          >
            <Maximize2 className="h-3 w-3" /> Sair do modo player
          </Link>
        </div>
      </div>
    </div>
  );
}
