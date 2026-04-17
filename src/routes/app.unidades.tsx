import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import { useProfileQuery, useUnitsQuery, useUnitMutations, useSignageEnabled } from "@/hooks/use-signage";
import { recordStatusLabel } from "@/lib/signage-ui-helpers";
import { Plus, MapPin, Phone, User, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/app/unidades")({
  head: () => ({ meta: [{ title: "Unidades — Signix" }] }),
  component: UnitsPage,
});

type UnitRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  status: string;
  screens?: { count: number }[];
};

function UnitsPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: units = [], isLoading: lu, error: ue, refetch: rfU } = useUnitsQuery(orgId);
  const { create, remove } = useUnitMutations(orgId);

  const list = units as UnitRow[];

  const screenCount = (u: UnitRow) => u.screens?.[0]?.count ?? 0;

  const onCreate = () => {
    const name = window.prompt("Nome da unidade?");
    if (!name?.trim()) return;
    create.mutate(
      { name: name.trim() },
      {
        onError: (e) => {
          console.error("[Signix] create unit", e);
          window.alert(e instanceof Error ? e.message : "Erro ao criar");
        },
      },
    );
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Excluir unidade? Telas podem ficar sem vínculo.")) return;
    remove.mutate(id, {
      onError: (e) => {
        console.error("[Signix] delete unit", e);
        window.alert(e instanceof Error ? e.message : "Erro ao excluir");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Unidades / Locais" subtitle="Locais físicos onde as telas estão instaladas." />
        <EmptyPanel title="Modo preview" hint="Defina Supabase no .env para carregar unidades." />
      </div>
    );
  }

  if (lp || lu) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unidades / Locais" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || ue) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unidades / Locais" subtitle="Erro" />
        <ErrorPanel message={(pe ?? ue)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfU(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades / Locais"
        subtitle="Locais físicos onde as telas estão instaladas."
        actions={
          <button
            type="button"
            onClick={onCreate}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Nova unidade
          </button>
        }
      />

      {list.length === 0 ? (
        <EmptyPanel title="Nenhuma unidade" hint="Crie a primeira unidade da organização." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((u) => (
            <article
              key={u.id}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-smooth"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  title="Excluir unidade"
                  onClick={() => onDelete(u.id)}
                  disabled={remove.isPending}
                  className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent disabled:opacity-50"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <h3 className="font-display text-base font-semibold mt-3">{u.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[u.address, u.city, u.state].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" /> Responsável
                  </div>
                  <div className="font-medium mt-0.5 truncate">{u.manager_name ?? "—"}</div>
                </div>
                <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" /> Telefone
                  </div>
                  <div className="font-medium mt-0.5 truncate">{u.manager_phone ?? "—"}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                <StatusBadge
                  tone={u.status === "active" ? "success" : "neutral"}
                  label={recordStatusLabel(u.status)}
                />
                <span className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{screenCount(u)}</span> telas
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
