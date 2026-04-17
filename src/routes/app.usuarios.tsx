import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockUsers } from "@/lib/mock-data";
import { Plus, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e permissões — Signix" }] }),
  component: UsersPage,
});

const roleTone: Record<string, "primary" | "success" | "warning" | "neutral"> = {
  "Admin Master": "primary",
  Gestor: "success",
  Operador: "warning",
  Visualizador: "neutral",
};

function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários e permissões"
        subtitle="Gerencie quem tem acesso ao painel e o nível de permissão."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Convidar usuário
          </button>
        }
      />
      <Panel bodyClassName="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-left">Usuário</th>
              <th className="px-5 py-3 text-left">Perfil</th>
              <th className="px-5 py-3 text-left">Unidade</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-surface/40">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">
                      {u.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {u.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge tone={roleTone[u.role]} label={u.role} withDot={false} />
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{u.unit}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge
                    tone={u.status === "ativo" ? "success" : "neutral"}
                    label={u.status}
                  />
                </td>
                <td className="px-5 py-3.5">
                  <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Shield className="h-3 w-3" /> Permissões
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
