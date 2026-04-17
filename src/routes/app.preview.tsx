import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { mockMedia, mockCampaigns } from "@/lib/mock-data";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  Monitor,
  Smartphone,
  Square,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/preview")({
  head: () => ({ meta: [{ title: "Preview de campanhas — Signix" }] }),
  component: PreviewPage,
});

function PreviewPage() {
  const items = mockMedia.slice(0, 6);
  const [idx, setIdx] = useState(0);
  const [orient, setOrient] = useState<"horizontal" | "vertical">("horizontal");
  const current = items[idx];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preview de campanhas"
        subtitle="Visualize como a campanha será exibida no player antes de publicar."
        actions={
          <Link
            to="/player"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            <Maximize className="h-3.5 w-3.5" /> Tela cheia
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrient("horizontal")}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${orient === "horizontal" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"}`}
            >
              <Monitor className="h-3.5 w-3.5" /> 16:9
            </button>
            <button
              onClick={() => setOrient("vertical")}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${orient === "vertical" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"}`}
            >
              <Smartphone className="h-3.5 w-3.5" /> 9:16
            </button>
          </div>

          <div
            className={`relative mx-auto rounded-2xl border border-border bg-black overflow-hidden shadow-elegant ${orient === "horizontal" ? "aspect-video w-full" : "aspect-[9/16] max-w-sm"}`}
          >
            <img src={current.url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-widest">Black Friday 2025</p>
                <p className="font-display text-lg font-bold">{current.name}</p>
              </div>
              <span className="font-mono text-xs bg-black/50 backdrop-blur-md rounded px-2 py-0.5">
                {current.duration}s
              </span>
            </div>
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2 py-0.5 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> PREVIEW
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-3">
            <button
              onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
              className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button className="h-11 w-11 grid place-items-center rounded-full bg-gradient-primary shadow-glow">
              <Play className="h-5 w-5 text-primary-foreground" />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % items.length)}
              className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-border mx-2" />
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <input type="range" defaultValue={70} className="w-32 accent-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Itens da playlist">
            <ul className="space-y-1.5">
              {items.map((m, i) => (
                <li key={m.id}>
                  <button
                    onClick={() => setIdx(i)}
                    className={`w-full flex items-center gap-2.5 rounded-md p-2 text-left transition-smooth ${i === idx ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-surface/60"}`}
                  >
                    <span className="text-[11px] font-mono text-muted-foreground w-5">
                      #{i + 1}
                    </span>
                    <div className="h-9 w-14 rounded overflow-hidden bg-muted shrink-0">
                      <img src={m.thumb} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.duration}s</p>
                    </div>
                    {i === idx && <Square className="h-3 w-3 text-primary fill-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Detalhes">
            <dl className="text-xs space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Campanha</dt>
                <dd>{mockCampaigns[0].name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Itens</dt>
                <dd>{items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duração total</dt>
                <dd>{items.reduce((s, m) => s + m.duration, 0)}s</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Telas alvo</dt>
                <dd>{mockCampaigns[0].screens}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
