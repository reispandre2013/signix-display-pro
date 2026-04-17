import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useAlerts, useResolveAlert, useScreens } from "@/lib/hooks/use-supabase-data";
import { AlertTriangle, CheckCircle2, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/alertas")({
  head: () => ({ meta: [{ title: "Alertas e falhas — Signix" }] }),
  component: AlertsPage,
});

const sevTone: Record<string, "destructive" | "warning" | "info" | "neutral"> = {
  critical: "destructive",
  high: "destructive",
  medium: "warning",
  low: "info",
};
const sevLabel: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

function AlertsPage() {
  const { data: alerts = [], isLoading, error } = useAlerts();
  const { data: screens = [] } = useScreens();
  const resolve = useResolveAlert();

  const screenName = (id: string | null) =>
    screens.find((s) => s.id === id)?.name ?? "Tela desconhecida";

  return (
    <div className="space-y-6">
      <PageHeader title="Alertas e falhas" subtitle="Eventos detectados nos players com nível de severidade." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Críticos", v: alerts.filter((a) => a.severity === "critical").length },
          { l: "Alta", v: alerts.filter((a) => a.severity === "high").length },
          { l: "Pendentes", v: alerts.filter((a) => !a.resolved_at).length },
          { l: "Resolvidos", v: alerts.filter((a) => a.resolved_at).length },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="Nenhum alerta registrado"
            description="Os alertas dos seus players aparecem aqui em tempo real."
          />
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((a) => {
              const resolved = !!a.resolved_at;
              return (
                <li key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-surface/40 transition-colors">
                  <div
                    className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                      resolved ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {resolved ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{a.alert_type}</p>
                      <StatusBadge tone={sevTone[a.severity]} label={sevLabel[a.severity]} withDot={false} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {screenName(a.screen_id)} ·{" "}
                      {formatDistanceToNow(new Date(a.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">{a.message}</p>
                  </div>
                  {!resolved ? (
                    <button
                      disabled={resolve.isPending}
                      onClick={() => resolve.mutate(a.id)}
                      className="text-xs rounded-md border border-border bg-surface px-2.5 py-1 hover:bg-accent disabled:opacity-50"
                    >
                      Resolver
                    </button>
                  ) : (
                    <StatusBadge tone="success" label="Resolvido" withDot={false} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
