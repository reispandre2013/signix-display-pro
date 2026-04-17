import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockPlaylists, mockMedia } from "@/lib/mock-data";
import { Plus, ListVideo, Clock, GripVertical, Eye, Play, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/app/playlists")({
  head: () => ({ meta: [{ title: "Playlists — Signix" }] }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const items = mockMedia.slice(0, 6);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlists"
        subtitle="Sequências de mídias prontas para serem usadas em campanhas."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Nova playlist
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {mockPlaylists.map((p, i) => (
            <button key={p.id} className={`w-full text-left rounded-lg border ${i === 0 ? "border-primary/50 bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/30"} p-4 transition-smooth`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center"><ListVideo className="h-4 w-4 text-primary-foreground" /></div>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.items} itens · {Math.floor(p.duration / 60)}min</p>
                  </div>
                </div>
                <StatusBadge tone={p.status === "publicada" ? "success" : "neutral"} label={p.status} withDot={false} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          <Panel
            title={mockPlaylists[0].name}
            description="Arraste para reordenar os itens. Cada um terá sua duração de exibição."
            actions={
              <>
                <Link to="/app/preview" className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-accent">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Link>
                <button className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2.5 py-1.5 text-xs hover:bg-primary/20">
                  <Play className="h-3.5 w-3.5" /> Publicar
                </button>
              </>
            }
          >
            <ul className="space-y-2">
              {items.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-2.5 hover:border-primary/30 transition-smooth">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="h-12 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                    <img src={m.thumb} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> {m.type} · {m.size}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono">
                    <Clock className="h-3 w-3 text-muted-foreground" /> {m.duration}s
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground w-6 text-right">#{i + 1}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
