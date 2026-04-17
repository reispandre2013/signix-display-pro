import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import { useMediaMutations, useMediaQuery, useProfileQuery, useSignageEnabled } from "@/hooks/use-signage";
import { formatBytes } from "@/lib/signage-queries";
import { recordStatusLabel } from "@/lib/signage-ui-helpers";
import {
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

type MediaRow = {
  id: string;
  name: string;
  file_type: string;
  public_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size: number | null;
  status: string;
  created_at: string;
};

function MediaPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: media = [], isLoading: lm, error: me, refetch: rfM } = useMediaQuery(orgId);
  const { remove } = useMediaMutations(orgId);

  const list = media as MediaRow[];

  const thumb = (m: MediaRow) => m.thumbnail_url || m.public_url || "";
  const typeLabel = (m: MediaRow) => m.file_type?.toLowerCase() ?? "";
  const isVideo = typeLabel.includes("video") || typeLabel === "mp4" || typeLabel === "webm";

  const onDelete = (id: string) => {
    if (!window.confirm("Excluir mídia?")) return;
    remove.mutate(id, {
      onError: (e) => {
        console.error("[Signix] delete media", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Biblioteca de mídias" subtitle="Modo preview." />
        <EmptyPanel title="Mídias" hint="Conecte o Supabase para ver arquivos." />
      </div>
    );
  }

  if (lp || lm) {
    return (
      <div className="space-y-6">
        <PageHeader title="Biblioteca de mídias" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || me) {
    return (
      <div className="space-y-6">
        <PageHeader title="Biblioteca de mídias" subtitle="Erro" />
        <ErrorPanel message={(pe ?? me)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfM(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de mídias"
        subtitle="Arquivos disponíveis para uso em playlists e campanhas."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
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
        title={`${list.length} arquivos`}
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar mídia…"
                className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              <Filter className="h-3.5 w-3.5" /> Filtrar
            </button>
          </>
        }
      >
        {list.length === 0 ? (
          <EmptyPanel title="Sem mídias" hint="Envie arquivos ao bucket configurado no Supabase Storage." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {list.map((m) => {
              const src = thumb(m);
              const dur = m.duration_seconds ?? 0;
              const tone =
                m.status === "active" ? "success" : m.status === "archived" ? "destructive" : "neutral";
              return (
                <article
                  key={m.id}
                  className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-glow transition-smooth"
                >
                  <div className="relative aspect-video bg-surface overflow-hidden">
                    {src ? (
                      <img src={src} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] text-white uppercase tracking-wider font-medium">
                      {isVideo ? (
                        <Video className="h-2.5 w-2.5" />
                      ) : typeLabel.includes("html") ? (
                        <FileCode className="h-2.5 w-2.5" />
                      ) : (
                        <ImageIcon className="h-2.5 w-2.5" />
                      )}
                      {m.file_type}
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <StatusBadge tone={tone} label={recordStatusLabel(m.status)} withDot={false} />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 text-[10px] text-white font-mono bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5">
                      {dur}s
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-xs font-medium truncate flex-1">{m.name}</p>
                      <button
                        type="button"
                        title="Excluir"
                        onClick={() => onDelete(m.id)}
                        disabled={remove.isPending}
                        className="h-5 w-5 grid place-items-center rounded hover:bg-accent shrink-0 disabled:opacity-50"
                      >
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatBytes(m.file_size)} · {format(new Date(m.created_at), "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
