import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockUnits } from "@/lib/mock-data";
import { Plus, MapPin, Phone, User, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/app/unidades")({
  head: () => ({ meta: [{ title: "Unidades — Signix" }] }),
  component: UnitsPage,
});

function UnitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades / Locais"
        subtitle="Locais físicos onde as telas estão instaladas."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Nova unidade
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockUnits.map((u) => (
          <article
            key={u.id}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-smooth"
          >
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <h3 className="font-display text-base font-semibold mt-3">{u.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {u.address} · {u.city}/{u.state}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" /> Responsável
                </div>
                <div className="font-medium mt-0.5 truncate">{u.responsible}</div>
              </div>
              <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3 w-3" /> Telefone
                </div>
                <div className="font-medium mt-0.5 truncate">{u.phone}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
              <StatusBadge
                tone={u.status === "active" ? "success" : "neutral"}
                label={u.status === "active" ? "Ativa" : "Inativa"}
              />
              <span className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{u.screens}</span> telas
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
