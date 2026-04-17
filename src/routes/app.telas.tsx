import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockScreens } from "@/lib/mock-data";
import { Plus, Search, Filter, MoreHorizontal, MonitorSmartphone, MapPin, Cpu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/telas")({
  head: () => ({ meta: [{ title: "Telas e Players — Signix" }] }),
  component: ScreensPage,
});

function ScreensPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Telas / Players"
        subtitle="Gerencie todos os dispositivos físicos conectados ao Signix."
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent transition-smooth">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </button>
            <Link
              to="/pareamento"
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar tela
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Total", v: mockScreens.length, t: "primary" },
          { l: "Online", v: mockScreens.filter((s) => s.status === "online").length, t: "success" },
          {
            l: "Offline",
            v: mockScreens.filter((s) => s.status === "offline").length,
            t: "destructive",
          },
          {
            l: "Atenção",
            v: mockScreens.filter((s) => s.status === "warning").length,
            t: "warning",
          },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      <Panel
        title={`${mockScreens.length} dispositivos`}
        description="Lista completa com filtros e busca."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar por nome, código…"
                className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Th>Tela</Th>
                <Th>Unidade</Th>
                <Th>Status</Th>
                <Th>Plataforma</Th>
                <Th>Resolução</Th>
                <Th>Campanha atual</Th>
                <Th>Último ping</Th>
                <Th>Saúde</Th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {mockScreens.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border/50 hover:bg-surface/40 transition-colors"
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center">
                        <MonitorSmartphone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{s.pairCode}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {s.unit}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Cpu className="h-3 w-3 text-muted-foreground" />
                      {s.platform}
                    </span>
                    <p className="text-[10px] text-muted-foreground font-mono">{s.playerVersion}</p>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">{s.resolution}</span>
                    <p className="text-[10px] text-muted-foreground">{s.orientation}</p>
                  </Td>
                  <Td>
                    <span className="text-xs">{s.currentCampaign ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.lastPing), { locale: ptBR, addSuffix: true })}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2 w-24">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${s.health > 80 ? "bg-success" : s.health > 50 ? "bg-warning" : "bg-destructive"}`}
                          style={{ width: `${s.health}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground w-7 text-right">
                        {s.health}%
                      </span>
                    </div>
                  </Td>
                  <td className="px-4 py-3">
                    <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent transition-colors">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>
            Mostrando {mockScreens.length} de {mockScreens.length} dispositivos
          </span>
          <div className="flex items-center gap-1">
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-accent">
              Anterior
            </button>
            <button className="rounded-md border border-border px-2.5 py-1 bg-primary/10 text-primary">
              1
            </button>
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-accent">
              2
            </button>
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-accent">
              Próxima
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
