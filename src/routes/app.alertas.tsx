import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import { useAlertMutations, useAlertsQuery, useProfileQuery, useSignageEnabled } from "@/hooks/use-signage";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
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

type AlertRow = {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
  screens: { name: string } | null;
};

function AlertsPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: alerts = [], isLoading: la, error: ae, refetch: rfA } = useAlertsQuery(orgId);
  const { resolve } = useAlertMutations(orgId);

  const list = alerts as AlertRow[];

  const stats = useMemo(() => {
    const critical = list.filter((a) => a.severity === "critical").length;
    const high = list.filter((a) => a.severity === "high").length;
    const pending = list.filter((a) => !a.resolved_at).length;
    const resolved = list.filter((a) => !!a.resolved_at).length;
    return { critical, high, pending, resolved };
  }, [list]);

  const onResolve = (id: string) => {
    resolve.mutate(id, {
      onError: (e) => {
        console.error("[Signix] resolve alert", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Alertas e falhas" subtitle="Modo preview." />
        <EmptyPanel title="Alertas" hint="Conecte o Supabase." />
      </div>
    );
  }

  if (lp || la) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alertas e falhas" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || ae) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alertas" subtitle="Erro" />
        <ErrorPanel message={(pe ?? ae)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfA(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas e falhas"
        subtitle="Eventos detectados nos players com nível de severidade."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Críticos", v: stats.critical, t: "destructive" as const },
          { l: "Alta", v: stats.high, t: "warning" as const },
          { l: "Pendentes", v: stats.pending, t: "primary" as const },
          { l: "Resolvidos", v: stats.resolved, t: "success" as const },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        {list.length === 0 ? (
          <div className="p-6">
            <EmptyPanel title="Sem alertas" hint="Nada registrado para esta organização." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((a) => {
              const resolved = !!a.resolved_at;
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-surface/40 transition-colors"
                >
                  <div
                    className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${resolved ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                  >
                    {resolved ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{a.alert_type}</p>
                      <StatusBadge
                        tone={sevTone[a.severity] ?? "neutral"}
                        label={sevLabel[a.severity] ?? a.severity}
                        withDot={false}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {a.screens?.name ?? "—"} ·{" "}
                      {formatDistanceToNow(new Date(a.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">{a.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge
                      tone={resolved ? "success" : "warning"}
                      label={resolved ? "Resolvido" : "Pendente"}
                      withDot={false}
                    />
                    {!resolved && (
                      <button
                        type="button"
                        onClick={() => onResolve(a.id)}
                        disabled={resolve.isPending}
                        className="text-[11px] text-primary hover:underline disabled:opacity-50"
                      >
                        Marcar resolvido
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
