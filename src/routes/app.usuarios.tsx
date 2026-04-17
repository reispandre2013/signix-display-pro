import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useUsers } from "@/lib/hooks/use-supabase-data";
import { Mail, Users } from "lucide-react";

export const Route = createFileRoute("/app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e permissões — Signix" }] }),
  component: UsersPage,
});

const roleLabel = { admin_master: "Admin Master", gestor: "Gestor", operador: "Operador", visualizador: "Visualizador" } as const;
const roleTone = { admin_master: "primary", gestor: "success", operador: "warning", visualizador: "neutral" } as const;

function UsersPage() {
  const q = useUsers();
  const users = q.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários e permissões" subtitle="Quem tem acesso ao painel e em que nível." />
      <Panel bodyClassName="p-0">
        {q.isLoading ? <LoadingState /> :
         q.error ? <div className="p-4"><ErrorState error={q.error} /></div> :
         users.length === 0 ? (
          <EmptyState title="Nenhum usuário ainda" description="Convide pessoas para colaborar na sua organização." icon={Users} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left">Usuário</th>
                <th className="px-5 py-3 text-left">Perfil</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-surface/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">
                        {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge tone={roleTone[u.role]} label={roleLabel[u.role]} withDot={false} /></td>
                  <td className="px-5 py-3.5"><StatusBadge tone={u.status === "active" ? "success" : "neutral"} label={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
