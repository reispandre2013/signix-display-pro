import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockGroups } from "@/lib/mock-data";
import { Plus, Layers, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/app/grupos")({
  head: () => ({ meta: [{ title: "Grupos de telas — Signix" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Grupos de telas"
        subtitle="Agrupe telas por finalidade para distribuir campanhas em massa."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Novo grupo
          </button>
        }
      />
      <Panel bodyClassName="p-0">
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
            {mockGroups.map((g) => (
              <tr key={g.id} className="border-b border-border/50 hover:bg-surface/40">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center text-primary">
                      <Layers className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{g.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{g.description}</td>
                <td className="px-5 py-3.5 font-mono">{g.screens}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge
                    tone={g.status === "ativo" ? "success" : "neutral"}
                    label={g.status}
                  />
                </td>
                <td className="px-5 py-3.5">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
