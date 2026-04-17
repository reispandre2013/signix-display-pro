import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockMedia } from "@/lib/mock-data";
import {
  Plus,
  Upload,
  Filter,
  Search,
  Image as ImageIcon,
  Video,
  FileCode,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/midias")({
  head: () => ({ meta: [{ title: "Biblioteca de mídias — Signix" }] }),
  component: MediaPage,
});

function MediaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de mídias"
        subtitle="Arquivos disponíveis para uso em playlists e campanhas."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Upload className="h-3.5 w-3.5" /> Enviar mídias
          </button>
        }
      />

      <div className="rounded-xl border-2 border-dashed border-border bg-surface/30 p-8 text-center hover:border-primary/40 hover:bg-surface/50 transition-smooth">
        <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary mb-3">
          <Upload className="h-6 w-6" />
        </div>
        <p className="font-display text-base font-semibold">Arraste arquivos para enviar</p>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, MP4, WEBM, HTML — até 200MB cada.
        </p>
      </div>

      <Panel
        title={`${mockMedia.length} arquivos`}
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar mídia…"
                className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-accent">
              <Filter className="h-3.5 w-3.5" /> Filtrar
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {mockMedia.map((m) => (
            <article
              key={m.id}
              className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-glow transition-smooth"
            >
              <div className="relative aspect-video bg-surface overflow-hidden">
                <img
                  src={m.thumb}
                  alt={m.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] text-white uppercase tracking-wider font-medium">
                  {m.type === "vídeo" ? (
                    <Video className="h-2.5 w-2.5" />
                  ) : m.type === "html" ? (
                    <FileCode className="h-2.5 w-2.5" />
                  ) : (
                    <ImageIcon className="h-2.5 w-2.5" />
                  )}
                  {m.type}
                </div>
                <div className="absolute top-1.5 right-1.5">
                  <StatusBadge
                    tone={
                      m.status === "ativo"
                        ? "success"
                        : m.status === "expirado"
                          ? "destructive"
                          : "neutral"
                    }
                    label={m.status}
                    withDot={false}
                  />
                </div>
                <div className="absolute bottom-1.5 left-1.5 text-[10px] text-white font-mono bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5">
                  {m.duration}s
                </div>
              </div>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1.5">
                  <p className="text-xs font-medium truncate flex-1">{m.name}</p>
                  <button className="h-5 w-5 grid place-items-center rounded hover:bg-accent shrink-0">
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {m.size} · {format(new Date(m.uploadedAt), "dd/MM", { locale: ptBR })}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
