import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockAlerts } from "@/lib/mock-data";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/alertas")({
  head: () => ({ meta: [{ title: "Alertas e falhas — Signix" }] }),
  component: AlertsPage,
});

const sevTone: Record<string, "destructive" | "warning" | "info" | "neutral"> = {
  critical: "destructive", high: "destructive", medium: "warning", low: "info",
};
const sevLabel: Record<string, string> = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" };

function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Alertas e falhas" subtitle="Eventos detectados nos players com nível de severidade." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Críticos", v: mockAlerts.filter((a) => a.severity === "critical").length, t: "destructive" as const },
          { l: "Alta", v: mockAlerts.filter((a) => a.severity === "high").length, t: "warning" as const },
          { l: "Pendentes", v: mockAlerts.filter((a) => !a.resolved).length, t: "primary" as const },
          { l: "Resolvidos", v: mockAlerts.filter((a) => a.resolved).length, t: "success" as const },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {mockAlerts.map((a) => (
            <li key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-surface/40 transition-colors">
              <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${a.resolved ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {a.resolved ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{a.type}</p>
                  <StatusBadge tone={sevTone[a.severity]} label={sevLabel[a.severity]} withDot={false} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.screen} · {formatDistanceToNow(new Date(a.date), { locale: ptBR, addSuffix: true })}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{a.message}</p>
              </div>
              <StatusBadge tone={a.resolved ? "success" : "warning"} label={a.resolved ? "Resolvido" : "Pendente"} withDot={false} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
