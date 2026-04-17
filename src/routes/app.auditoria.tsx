import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useAuditLogs, useUsers } from "@/lib/hooks/use-supabase-data";
import { ScrollText, User, FileSearch } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Signix" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { data: logs = [], isLoading, error } = useAuditLogs();
  const { data: users = [] } = useUsers();

  const userName = (id: string | null) =>
    users.find((u) => u.id === id)?.name ?? "Sistema";

  return (
    <div className="space-y-6">
      <PageHeader title="Logs e auditoria" subtitle="Registro completo de ações realizadas no sistema." />
      <Panel bodyClassName="p-0">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="Nenhum log registrado"
            description="As ações realizadas no painel aparecerão aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface/40">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                  <ScrollText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium inline-flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {userName(l.actor_profile_id)}
                    </span>
                    <span className="text-muted-foreground"> {l.action} </span>
                    <span className="text-primary font-medium">{l.entity_type}</span>
                    {l.entity_id && (
                      <>
                        <span className="text-muted-foreground"> · </span>
                        <span className="font-mono text-[11px]">{l.entity_id.slice(0, 8)}</span>
                      </>
                    )}
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
