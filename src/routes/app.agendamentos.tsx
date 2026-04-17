import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockSchedules } from "@/lib/mock-data";
import { Plus, Clock, Repeat, Globe, Calendar as CalendarIcon } from "lucide-react";

export const Route = createFileRoute("/app/agendamentos")({
  head: () => ({ meta: [{ title: "Agendamentos — Signix" }] }),
  component: SchedulePage,
});

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function SchedulePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        subtitle="Programe quando cada campanha será exibida nas suas telas."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
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
          <ul className="space-y-3">
            {mockSchedules.map((s) => (
              <li key={s.id} className="rounded-lg border border-border bg-surface/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{s.campaign}</p>
                  <StatusBadge
                    tone={s.status === "ativa" ? "success" : "warning"}
                    label={s.status}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {s.start} – {s.end}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Repeat className="h-3 w-3" /> {s.recurrence}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> {s.days.join(", ")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3 w-3" /> SP
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
