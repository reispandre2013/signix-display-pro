import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useCampaignMutations,
  useCampaignsQuery,
  usePlaylistsQuery,
  useProfileQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import { campaignStatusLabel } from "@/lib/signage-queries";
import { campaignPriorityLabel } from "@/lib/signage-ui-helpers";
import {
  Plus,
  Megaphone,
  Calendar,
  Layers,
  Pause,
  Play,
  Eye,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — Signix" }] }),
  component: CampaignsPage,
});

const priorityTone: Record<string, "primary" | "warning" | "destructive" | "neutral"> = {
  baixa: "neutral",
  média: "primary",
  alta: "warning",
  crítica: "destructive",
};

const statusTone: Record<string, "success" | "warning" | "neutral" | "primary"> = {
  active: "success",
  scheduled: "primary",
  paused: "warning",
  ended: "neutral",
  draft: "neutral",
};

type CampRow = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  start_at: string;
  end_at: string;
  status: string;
  playlists: { name: string } | null;
};

function CampaignsPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: campaigns = [], isLoading: lc, error: ce, refetch: rfC } = useCampaignsQuery(orgId);
  const { data: playlists = [] } = usePlaylistsQuery(orgId);
  const { create, update, remove } = useCampaignMutations(orgId);

  const list = campaigns as CampRow[];

  const onCreate = () => {
    const name = window.prompt("Nome da campanha?");
    if (!name?.trim()) return;
    if (!playlists.length) {
      window.alert("Crie uma playlist antes.");
      return;
    }
    const plHint = playlists
      .map((p: { id: string; name: string }) => `${p.name}=${p.id}`)
      .join("\n");
    const pid = window.prompt(`ID da playlist:\n${plHint}`);
    if (!pid?.trim()) return;
    const start = window.prompt("Início (ISO, ex: 2026-05-01T08:00:00Z)", new Date().toISOString());
    if (!start?.trim()) return;
    const end = window.prompt("Fim (ISO)", new Date(Date.now() + 86400000 * 30).toISOString());
    if (!end?.trim()) return;
    create.mutate(
      { name: name.trim(), playlist_id: pid.trim(), start_at: start.trim(), end_at: end.trim() },
      {
        onError: (e) => {
          console.error("[Signix] create campaign", e);
          window.alert(e instanceof Error ? e.message : "Erro");
        },
      },
    );
  };

  const onPauseToggle = (c: CampRow) => {
    const next = c.status === "paused" ? "active" : "paused";
    update.mutate(
      { id: c.id, patch: { status: next } },
      {
        onError: (e) => {
          console.error("[Signix] update campaign", e);
          window.alert(e instanceof Error ? e.message : "Erro");
        },
      },
    );
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Excluir campanha?")) return;
    remove.mutate(id, {
      onError: (e) => {
        console.error("[Signix] delete campaign", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Campanhas" subtitle="Modo preview — sem dados ao vivo." />
        <EmptyPanel title="Campanhas" hint="Conecte o Supabase para listar campanhas." />
      </div>
    );
  }

  if (lp || lc) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campanhas" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || ce) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campanhas" subtitle="Erro" />
        <ErrorPanel message={(pe ?? ce)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfC(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        subtitle="Crie, programe e veicule playlists em grupos de telas e unidades."
        actions={
          <button
            type="button"
            onClick={onCreate}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Nova campanha
          </button>
        }
      />

      {list.length === 0 ? (
        <EmptyPanel title="Nenhuma campanha" hint="Crie campanhas vinculadas a playlists existentes." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((c) => {
            const prio = campaignPriorityLabel(c.priority);
            return (
              <article
                key={c.id}
                className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:border-primary/40 hover:shadow-glow transition-smooth"
              >
                <div className="relative h-32 bg-gradient-primary overflow-hidden">
                  <img
                    src={`https://picsum.photos/seed/${c.id}/640/240`}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <StatusBadge
                      tone={statusTone[c.status] ?? "neutral"}
                      label={campaignStatusLabel(c.status).toUpperCase()}
                    />
                    <StatusBadge
                      tone={priorityTone[prio] ?? "neutral"}
                      label={`PRIO · ${prio.toUpperCase()}`}
                      withDot={false}
                    />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="font-display text-lg font-bold leading-tight">{c.name}</h3>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description ?? "—"}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <Stat icon={Layers} label="Playlist" value={c.playlists?.name ?? "—"} />
                    <Stat icon={Megaphone} label="Prioridade" value={String(c.priority)} />
                    <Stat
                      icon={Calendar}
                      label="Início"
                      value={format(new Date(c.start_at), "dd/MM/yyyy", { locale: ptBR })}
                    />
                    <Stat
                      icon={Calendar}
                      label="Fim"
                      value={format(new Date(c.end_at), "dd/MM/yyyy", { locale: ptBR })}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-3 border-t border-border">
                    <Link
                      to="/app/preview"
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent transition-smooth"
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </Link>
                    <button
                      type="button"
                      onClick={() => onPauseToggle(c)}
                      disabled={update.isPending}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1.5 text-xs hover:bg-primary/20 transition-smooth disabled:opacity-60"
                    >
                      {c.status === "paused" ? (
                        <>
                          <Play className="h-3 w-3" /> Retomar
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3" /> Pausar
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      onClick={() => onDelete(c.id)}
                      disabled={remove.isPending}
                      className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent disabled:opacity-50"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Panel
        title="Timeline de execução"
        description="Visualize o período de cada campanha."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto p-5">
          <div className="min-w-[900px] space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-2">
              <div className="col-span-3">Campanha</div>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="text-center">
                  Sem {i + 1}
                </div>
              ))}
            </div>
            {list.slice(0, 6).map((c, i) => {
              const prio = campaignPriorityLabel(c.priority);
              return (
                <div key={c.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-3 truncate font-medium flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" /> {c.name}
                  </div>
                  <div className="col-span-9 relative h-7 rounded-md bg-surface/50">
                    <div
                      className="absolute top-1 bottom-1 rounded-md bg-gradient-primary opacity-90 shadow-glow flex items-center justify-center text-[10px] font-semibold text-primary-foreground px-2"
                      style={{ left: `${(i * 7) % 30}%`, width: `${30 + ((i * 9) % 50)}%` }}
                    >
                      {prio.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-foreground font-medium truncate mt-0.5">{value}</div>
    </div>
  );
}
