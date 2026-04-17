import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import { useAuditQuery, useProfileQuery, useSignageEnabled } from "@/hooks/use-signage";
import { ScrollText, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Signix" }] }),
  component: AuditPage,
});

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  profiles: { name: string } | null;
};

function AuditPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: logs = [], isLoading: ll, error: le, refetch: rfL } = useAuditQuery(orgId);

  const list = logs as AuditRow[];

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Logs e auditoria" subtitle="Modo preview." />
        <EmptyPanel title="Auditoria" hint="Conecte o Supabase." />
      </div>
    );
  }

  if (lp || ll) {
    return (
      <div className="space-y-6">
        <PageHeader title="Logs e auditoria" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || le) {
    return (
      <div className="space-y-6">
        <PageHeader title="Auditoria" subtitle="Erro" />
        <ErrorPanel message={(pe ?? le)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfL(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs e auditoria"
        subtitle="Registro completo de ações realizadas no sistema."
      />
      <Panel bodyClassName="p-0">
        {list.length === 0 ? (
          <div className="p-6">
            <EmptyPanel
              title="Sem logs"
              hint="Logs aparecem quando há políticas de auditoria e permissão de gestor."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((l) => (
              <li key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface/40">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                  <ScrollText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium inline-flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {l.profiles?.name ?? "Sistema"}
                    </span>
                    <span className="text-muted-foreground"> {l.action} </span>
                    <span className="text-primary font-medium">{l.entity_type}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-medium font-mono text-xs">{l.entity_id ?? "—"}</span>
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                  {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
