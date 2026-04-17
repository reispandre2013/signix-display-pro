import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useProfileQuery,
  useScreenGroupMutations,
  useScreenGroupsQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import { recordStatusLabel } from "@/lib/signage-ui-helpers";
import { Plus, Layers, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/app/grupos")({
  head: () => ({ meta: [{ title: "Grupos de telas — Signix" }] }),
  component: GroupsPage,
});

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  screen_group_items?: { count: number }[];
};

function GroupsPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: groups = [], isLoading: lg, error: ge, refetch: rfG } = useScreenGroupsQuery(orgId);
  const { create, remove } = useScreenGroupMutations(orgId);

  const list = groups as GroupRow[];
  const screenCount = (g: GroupRow) => g.screen_group_items?.[0]?.count ?? 0;

  const onCreate = () => {
    const name = window.prompt("Nome do grupo?");
    if (!name?.trim()) return;
    create.mutate(name.trim(), {
      onError: (e) => {
        console.error("[Signix] create group", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Excluir grupo?")) return;
    remove.mutate(id, {
      onError: (e) => {
        console.error("[Signix] delete group", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Grupos de telas" subtitle="Modo preview." />
        <EmptyPanel title="Grupos" hint="Conecte o Supabase." />
      </div>
    );
  }

  if (lp || lg) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grupos de telas" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || ge) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grupos" subtitle="Erro" />
        <ErrorPanel message={(pe ?? ge)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfG(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grupos de telas"
        subtitle="Agrupe telas por finalidade para distribuir campanhas em massa."
        actions={
          <button
            type="button"
            onClick={onCreate}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Novo grupo
          </button>
        }
      />
      <Panel bodyClassName="p-0">
        {list.length === 0 ? (
          <div className="p-6">
            <EmptyPanel title="Nenhum grupo" hint="Crie grupos para segmentar telas." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left">Grupo</th>
                <th className="px-5 py-3 text-left">Descrição</th>
                <th className="px-5 py-3 text-left">Telas</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id} className="border-b border-border/50 hover:bg-surface/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center text-primary">
                        <Layers className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{g.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{g.description ?? "—"}</td>
                  <td className="px-5 py-3.5 font-mono">{screenCount(g)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      tone={g.status === "active" ? "success" : "neutral"}
                      label={recordStatusLabel(g.status)}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      title="Excluir"
                      onClick={() => onDelete(g.id)}
                      disabled={remove.isPending}
                      className="disabled:opacity-50"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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
