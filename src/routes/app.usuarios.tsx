import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useProfileDirectoryMutation,
  useProfilesDirectoryQuery,
  useProfileQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import { roleLabel } from "@/lib/signage-queries";
import { recordStatusLabel } from "@/lib/signage-ui-helpers";
import { Plus, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e permissões — Signix" }] }),
  component: UsersPage,
});

const roleTone: Record<string, "primary" | "success" | "warning" | "neutral"> = {
  admin_master: "primary",
  gestor: "success",
  operador: "warning",
  visualizador: "neutral",
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  units: { name: string } | null;
};

function UsersPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: profiles = [], isLoading: lpr, error: pre, refetch: rfPr } = useProfilesDirectoryQuery(orgId);
  const updateRow = useProfileDirectoryMutation(orgId);

  const list = profiles as ProfileRow[];

  const onToggleStatus = (u: ProfileRow) => {
    const next = u.status === "active" ? "inactive" : "active";
    updateRow.mutate(
      { id: u.id, patch: { status: next } },
      {
        onError: (e) => {
          console.error("[Signix] update profile", e);
          window.alert(e instanceof Error ? e.message : "Erro");
        },
      },
    );
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Usuários e permissões" subtitle="Modo preview." />
        <EmptyPanel title="Usuários" hint="Conecte o Supabase." />
      </div>
    );
  }

  if (lp || lpr) {
    return (
      <div className="space-y-6">
        <PageHeader title="Usuários e permissões" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || pre) {
    return (
      <div className="space-y-6">
        <PageHeader title="Usuários" subtitle="Erro" />
        <ErrorPanel message={(pe ?? pre)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfPr(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários e permissões"
        subtitle="Gerencie quem tem acesso ao painel e o nível de permissão."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
            onClick={() =>
              window.alert("Convites exigem Edge Function ou fluxo admin no Supabase — use o dashboard.")
            }
          >
            <Plus className="h-3.5 w-3.5" /> Convidar usuário
          </button>
        }
      />
      <Panel bodyClassName="p-0">
        {list.length === 0 ? (
          <div className="p-6">
            <EmptyPanel title="Sem usuários" hint="Perfis são criados após o cadastro em auth.users." />
          </div>
        ) : (
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
              {list.map((u) => (
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
                    <StatusBadge
                      tone={roleTone[u.role] ?? "neutral"}
                      label={roleLabel(u.role)}
                      withDot={false}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{u.units?.name ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      tone={u.status === "active" ? "success" : "neutral"}
                      label={recordStatusLabel(u.status)}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(u)}
                      disabled={updateRow.isPending}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      <Shield className="h-3 w-3" />{" "}
                      {u.status === "active" ? "Inativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
