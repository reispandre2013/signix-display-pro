import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useMedia, useCampaigns } from "@/lib/hooks/use-supabase-data";
import { applyMediaFallback, getMediaUrlCandidates } from "@/lib/media-url";
import {
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  Monitor,
  Smartphone,
  Square,
  Image as ImageIcon,
} from "lucide-react";

export const Route = createFileRoute("/app/preview")({
  head: () => ({ meta: [{ title: "Preview de campanhas — Signix" }] }),
  component: PreviewPage,
});

type MediaRow = {
  id: string;
  name: string;
  file_type: string;
  public_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
};

function PreviewPage() {
  const { data: media = [], isLoading, error } = useMedia();
  const { data: campaigns = [] } = useCampaigns();
  const items = media.slice(0, 6);
  const [idx, setIdx] = useState(0);
  const [orient, setOrient] = useState<"horizontal" | "vertical">("horizontal");
  const current = items[idx];
  const currentIsVideo = String(current?.file_type ?? "").toLowerCase().includes("video");
  const currentSources = current
    ? getMediaUrlCandidates(
        { mediaTypeHint: current.file_type?.toLowerCase().includes("video") ? "video" : "image" },
        current.public_url,
        current.thumbnail_url,
      )
    : [];

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Preview de campanhas" subtitle="Visualize antes de publicar." />
        <Panel>
          <EmptyState
            icon={ImageIcon}
            title="Sem mídias para visualizar"
            description="Adicione mídias na biblioteca para ver o preview aqui."
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasBackend && <PreviewModeBanner />}
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
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                orient === "horizontal" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" /> 16:9
            </button>
            <button
              onClick={() => setOrient("vertical")}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
                orient === "vertical" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" /> 9:16
            </button>
          </div>

          <div
            className={`relative mx-auto rounded-2xl border border-border bg-black overflow-hidden shadow-elegant ${
              orient === "horizontal" ? "aspect-video w-full" : "aspect-[9/16] max-w-sm"
            }`}
          >
            {currentSources.length > 0 ? (
              currentIsVideo ? (
                <video
                  key={`${current.id}-${currentSources[0]}`}
                  src={currentSources[0]}
                  className="w-full h-full object-cover bg-black"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  key={`${current.id}-${currentSources[0]}`}
                  src={currentSources[0]}
                  data-sources={JSON.stringify(currentSources)}
                  data-source-index="0"
                  alt={current.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => applyMediaFallback(e.currentTarget)}
                />
              )
            ) : (
              <div className="w-full h-full grid place-items-center text-white/40">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
              <div>
                <p className="text-xs text-white/60 uppercase tracking-widest">Preview</p>
                <p className="font-display text-lg font-bold">{current.name}</p>
              </div>
              <span className="font-mono text-xs bg-black/50 backdrop-blur-md rounded px-2 py-0.5">
                {current.duration_seconds ?? 10}s
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-3">
            <button onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)} className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent">
              <SkipBack className="h-4 w-4" />
            </button>
            <button className="h-11 w-11 grid place-items-center rounded-full bg-gradient-primary shadow-glow">
              <Play className="h-5 w-5 text-primary-foreground" />
            </button>
            <button onClick={() => setIdx((i) => (i + 1) % items.length)} className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent">
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-border mx-2" />
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <input type="range" defaultValue={70} className="w-32 accent-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Itens do preview">
            <ul className="space-y-1.5">
              {items.map((m, i) => (
                <li key={m.id}>
                  <button
                    onClick={() => setIdx(i)}
                    className={`w-full flex items-center gap-2.5 rounded-md p-2 text-left transition-smooth ${
                      i === idx ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-surface/60"
                    }`}
                  >
                    <span className="text-[11px] font-mono text-muted-foreground w-5">#{i + 1}</span>
                    <div className="h-9 w-14 rounded overflow-hidden bg-muted shrink-0">
                      {getMediaUrlCandidates(
                        { mediaTypeHint: m.file_type?.toLowerCase().includes("video") ? "video" : "image" },
                        m.thumbnail_url,
                        m.public_url,
                      )[0] && (
                        <img
                          src={
                            getMediaUrlCandidates(
                              { mediaTypeHint: m.file_type?.toLowerCase().includes("video") ? "video" : "image" },
                              m.thumbnail_url,
                              m.public_url,
                            )[0]
                          }
                          data-sources={JSON.stringify(
                            getMediaUrlCandidates(
                              { mediaTypeHint: m.file_type?.toLowerCase().includes("video") ? "video" : "image" },
                              m.thumbnail_url,
                              m.public_url,
                            ),
                          )}
                          data-source-index="0"
                          alt={m.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => applyMediaFallback(e.currentTarget)}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.duration_seconds ?? 10}s</p>
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
                <dd>{campaigns[0]?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Itens</dt>
                <dd>{items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duração total</dt>
                <dd>{items.reduce((s, m) => s + (m.duration_seconds ?? 10), 0)}s</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
