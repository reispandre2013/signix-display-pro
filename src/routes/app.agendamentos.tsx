import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useCampaignSchedules } from "@/lib/hooks/use-supabase-data";
import { CalendarClock, Clock, Repeat, Globe } from "lucide-react";

export const Route = createFileRoute("/app/agendamentos")({
  head: () => ({ meta: [{ title: "Agendamentos — Signix" }] }),
  component: SchedulePage,
});

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function SchedulePage() {
  const { data: schedules = [], isLoading, error } = useCampaignSchedules();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        subtitle="Programe quando cada campanha será exibida nas suas telas."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" title="Calendário semanal" description="Distribuição de campanhas ao longo da semana.">
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
                    const hourLabel = `${(7 + h).toString().padStart(2, "0")}:00`;
                    const match = schedules.find((s) => {
                      const startH = parseInt(s.start_time.slice(0, 2), 10);
                      const endH = parseInt(s.end_time.slice(0, 2), 10);
                      const dow = s.day_of_week;
                      const inHour = 7 + h >= startH && 7 + h < endH;
                      const inDay = dow === null || dow === di;
                      return inHour && inDay;
                    });
                    return (
                      <div
                        key={d + hourLabel}
                        className={`h-8 rounded-md border ${
                          match ? "bg-primary/20 border-primary/40" : "border-border/40 bg-surface/30"
                        }`}
                      >
                        {match && (
                          <div className="text-[9px] text-foreground/80 px-1.5 py-1 truncate">Camp</div>
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
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} />
          ) : schedules.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nenhum agendamento"
              description="Os agendamentos aparecem aqui ao vincular horários a campanhas."
            />
          ) : (
            <ul className="space-y-3">
              {schedules.map((s) => (
                <li key={s.id} className="rounded-lg border border-border bg-surface/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{s.campaigns?.name ?? "Campanha"}</p>
                    <StatusBadge tone={s.is_active ? "success" : "warning"} label={s.is_active ? "Ativa" : "Pausada"} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Repeat className="h-3 w-3" /> {s.recurrence_rule ?? "Diária"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {s.timezone}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {s.day_of_week === null ? "Todos os dias" : days[s.day_of_week]}
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
