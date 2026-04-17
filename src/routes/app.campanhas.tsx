import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockCampaigns } from "@/lib/mock-data";
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
  ativa: "success",
  agendada: "primary",
  pausada: "warning",
  encerrada: "neutral",
};

function CampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        subtitle="Crie, programe e veicule playlists em grupos de telas e unidades."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Nova campanha
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockCampaigns.map((c) => (
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
                <StatusBadge tone={statusTone[c.status]} label={c.status.toUpperCase()} />
                <StatusBadge
                  tone={priorityTone[c.priority]}
                  label={`PRIO · ${c.priority.toUpperCase()}`}
                  withDot={false}
                />
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="font-display text-lg font-bold leading-tight">{c.name}</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Stat icon={Layers} label="Playlist" value={c.playlistName} />
                <Stat icon={Megaphone} label="Telas" value={`${c.screens} • ${c.units} unidades`} />
                <Stat
                  icon={Calendar}
                  label="Início"
                  value={format(new Date(c.startDate), "dd/MM/yyyy", { locale: ptBR })}
                />
                <Stat
                  icon={Calendar}
                  label="Fim"
                  value={format(new Date(c.endDate), "dd/MM/yyyy", { locale: ptBR })}
                />
              </div>
              <div className="flex items-center gap-1.5 pt-3 border-t border-border">
                <Link
                  to="/app/preview"
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent transition-smooth"
                >
                  <Eye className="h-3 w-3" /> Preview
                </Link>
                <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1.5 text-xs hover:bg-primary/20 transition-smooth">
                  {c.status === "pausada" ? (
                    <>
                      <Play className="h-3 w-3" /> Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3" /> Pausar
                    </>
                  )}
                </button>
                <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

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
            {mockCampaigns.slice(0, 6).map((c, i) => (
              <div key={c.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-3 truncate font-medium flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" /> {c.name}
                </div>
                <div className="col-span-9 relative h-7 rounded-md bg-surface/50">
                  <div
                    className="absolute top-1 bottom-1 rounded-md bg-gradient-primary opacity-90 shadow-glow flex items-center justify-center text-[10px] font-semibold text-primary-foreground px-2"
                    style={{ left: `${(i * 7) % 30}%`, width: `${30 + ((i * 9) % 50)}%` }}
                  >
                    {c.priority.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
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
