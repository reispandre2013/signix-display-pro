import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { mockScreens } from "@/lib/mock-data";
import {
  Activity,
  RefreshCw,
  MonitorSmartphone,
  Wifi,
  WifiOff,
  Eye,
  AlertTriangle,
  LayoutGrid,
  List,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export const Route = createFileRoute("/app/monitoramento")({
  head: () => ({ meta: [{ title: "Monitoramento — Signix" }] }),
  component: MonitorPage,
});

function MonitorPage() {
  const [view, setView] = useState<"grid" | "table">("grid");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoramento em tempo real"
        subtitle="Saúde, status e atividade de cada player. Atualizado a cada 5 segundos."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> Live
            </span>
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded ${view === "grid" ? "bg-accent" : ""}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("table")}
                className={`p-1.5 rounded ${view === "table" ? "bg-accent" : ""}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
              <RefreshCw className="h-3.5 w-3.5" /> Forçar sincronização
            </button>
          </>
        }
      />

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {mockScreens.map((s) => (
            <div
              key={s.id}
              className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:border-primary/40 hover:shadow-glow transition-smooth"
            >
              <div className="relative aspect-video bg-gradient-surface overflow-hidden">
                {s.status !== "offline" ? (
                  <img
                    src={`https://picsum.photos/seed/${s.id}/640/360`}
                    alt=""
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <WifiOff className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <StatusBadge status={s.status} />
                </div>
                <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-md px-2 py-0.5 text-[10px] text-white font-mono">
                  {s.resolution}
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white">
                  <span className="rounded bg-black/50 backdrop-blur-md px-1.5 py-0.5">
                    {s.platform}
                  </span>
                  <span className="rounded bg-black/50 backdrop-blur-md px-1.5 py-0.5 font-mono">
                    {s.playerVersion}
                  </span>
                </div>
              </div>
              <div className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Saúde</p>
                    <p
                      className={`text-sm font-bold ${s.health > 80 ? "text-success" : s.health > 50 ? "text-warning" : "text-destructive"}`}
                    >
                      {s.health}%
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <p className="truncate">
                    <span className="text-foreground/80">Em exibição:</span>{" "}
                    {s.currentCampaign ?? "—"}
                  </p>
                  <p className="mt-0.5">
                    Último ping{" "}
                    {formatDistanceToNow(new Date(s.lastPing), { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                  <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent transition-smooth">
                    <Eye className="h-3 w-3" /> Detalhes
                  </button>
                  <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-[11px] hover:bg-primary/20 transition-smooth">
                    <RefreshCw className="h-3 w-3" /> Sync
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Panel bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left">Tela</th>
                  <th className="px-4 py-2.5 text-left">Unidade</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Saúde</th>
                  <th className="px-4 py-2.5 text-left">Último ping</th>
                  <th className="px-4 py-2.5 text-left">Sync</th>
                  <th className="px-4 py-2.5 text-left">Campanha</th>
                </tr>
              </thead>
              <tbody>
                {mockScreens.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface/40">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                      {s.name}
                    </td>
                    <td className="px-4 py-3">{s.unit}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          s.health > 80
                            ? "text-success"
                            : s.health > 50
                              ? "text-warning"
                              : "text-destructive"
                        }
                      >
                        {s.health}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(s.lastPing), { locale: ptBR, addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(s.lastSync), { locale: ptBR, addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 truncate max-w-xs">{s.currentCampaign ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
