import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useCampaignsQuery,
  useProfileQuery,
  useScheduleMutations,
  useSchedulesQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import { Plus, Clock, Repeat, Globe, Calendar as CalendarIcon } from "lucide-react";

export const Route = createFileRoute("/app/agendamentos")({
  head: () => ({ meta: [{ title: "Agendamentos — Signix" }] }),
  component: SchedulePage,
});

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ScheduleRow = {
  id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence_rule: string | null;
  is_active: boolean;
  campaigns: { name: string; organization_id: string } | null;
};

function SchedulePage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: schedules = [], isLoading: ls, error: se, refetch: rfS } = useSchedulesQuery(orgId);
  const { data: campaigns = [] } = useCampaignsQuery(orgId);
  const { create, remove } = useScheduleMutations(orgId);

  const list = schedules as ScheduleRow[];

  const onCreate = () => {
    if (!campaigns.length) {
      window.alert("Crie uma campanha antes.");
      return;
    }
    const hint = campaigns
      .map((c: { id: string; name: string }) => `${c.name}=${c.id}`)
      .join("\n");
    const cid = window.prompt(`ID da campanha:\n${hint}`);
    if (!cid?.trim()) return;
    const dow = window.prompt("Dia da semana (0=Dom … 6=Sáb)", "1");
    if (dow == null || dow === "") return;
    const start = window.prompt("Hora início (HH:MM:SS)", "08:00:00");
    if (!start?.trim()) return;
    const end = window.prompt("Hora fim (HH:MM:SS)", "18:00:00");
    if (!end?.trim()) return;
    create.mutate(
      {
        campaign_id: cid.trim(),
        day_of_week: Number.parseInt(dow, 10),
        start_time: start.trim(),
        end_time: end.trim(),
      },
      {
        onError: (e) => {
          console.error("[Signix] create schedule", e);
          window.alert(e instanceof Error ? e.message : "Erro");
        },
      },
    );
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Remover este agendamento?")) return;
    remove.mutate(id, {
      onError: (e) => {
        console.error("[Signix] delete schedule", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Agendamentos" subtitle="Modo preview." />
        <EmptyPanel title="Agendamentos" hint="Conecte o Supabase." />
      </div>
    );
  }

  if (lp || ls) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agendamentos" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || se) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agendamentos" subtitle="Erro" />
        <ErrorPanel message={(pe ?? se)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfS(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        subtitle="Programe quando cada campanha será exibida nas suas telas."
        actions={
          <button
            type="button"
            onClick={onCreate}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Novo agendamento
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Calendário semanal"
          description="Distribuição de campanhas ao longo da semana."
        >
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-8 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-2">
                <div>Hora</div>
                {days.map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>
              {Array.from({ length: 12 }).map((_, h) => (
                <div key={h} className="grid grid-cols-8 gap-1 mb-1 items-center">
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {(7 + h).toString().padStart(2, "0")}:00
                  </div>
                  {days.map((d, di) => {
                    const has = (h + di) % 4 === 0 || (h + di) % 5 === 0;
                    const tone =
                      (h + di) % 7 === 0
                        ? "bg-warning/30 border-warning/40"
                        : "bg-primary/20 border-primary/40";
                    return (
                      <div
                        key={d}
                        className={`h-8 rounded-md border ${has ? `${tone}` : "border-border/40 bg-surface/30"}`}
                      >
                        {has && (
                          <div className="text-[9px] text-foreground/80 px-1.5 py-1 truncate">
                            Camp #{(h + di) % 5}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Próximos agendamentos">
          {list.length === 0 ? (
            <EmptyPanel title="Sem agendamentos" hint="Crie janelas por campanha." />
          ) : (
            <ul className="space-y-3">
              {list.map((s) => (
                <li key={s.id} className="rounded-lg border border-border bg-surface/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{s.campaigns?.name ?? "Campanha"}</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={s.is_active ? "success" : "warning"}
                        label={s.is_active ? "Ativo" : "Inativo"}
                      />
                      <button
                        type="button"
                        onClick={() => onDelete(s.id)}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.start_time} – {s.end_time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Repeat className="h-3 w-3" /> {s.recurrence_rule ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />{" "}
                      {s.day_of_week != null ? days[s.day_of_week] : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {s.timezone}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
