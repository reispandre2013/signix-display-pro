import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { mockAudit } from "@/lib/mock-data";
import { ScrollText, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Signix" }] }),
  component: AuditPage,
});

function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Logs e auditoria" subtitle="Registro completo de ações realizadas no sistema." />
      <Panel bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {mockAudit.map((l) => (
            <li key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface/40">
              <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                <ScrollText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium inline-flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground" />{l.user}</span>
                  <span className="text-muted-foreground"> {l.action} </span>
                  <span className="text-primary font-medium">{l.entity}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="font-medium">{l.target}</span>
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                {format(new Date(l.date), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
