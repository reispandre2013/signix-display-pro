import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import { useProfileQuery, useScreensQuery, useSignageEnabled } from "@/hooks/use-signage";
import { screenHealthPercent } from "@/lib/signage-ui-helpers";
import {
  RefreshCw,
  MonitorSmartphone,
  WifiOff,
  Eye,
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

type ScreenRow = {
  id: string;
  name: string;
  resolution: string | null;
  platform: string | null;
  player_version: string | null;
  last_seen_at: string | null;
  last_sync_at: string | null;
  is_online: boolean;
  device_status: string;
  units: { name: string } | null;
  campaigns: { name: string } | null;
};

function MonitorPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: screens = [], isLoading: ls, error: se, refetch: rfS } = useScreensQuery(orgId);

  const list = screens as ScreenRow[];
  const [view, setView] = useState<"grid" | "table">("grid");

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Monitoramento em tempo real" subtitle="Modo preview." />
        <EmptyPanel title="Monitoramento" hint="Conecte o Supabase para ver telas." />
      </div>
    );
  }

  if (lp || ls) {
    return (
      <div className="space-y-6">
        <PageHeader title="Monitoramento em tempo real" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || se) {
    return (
      <div className="space-y-6">
        <PageHeader title="Monitoramento" subtitle="Erro" />
        <ErrorPanel message={(pe ?? se)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfS(); }} />
      </div>
    );
  }

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
                type="button"
                onClick={() => setView("grid")}
                className={`p-1.5 rounded ${view === "grid" ? "bg-accent" : ""}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`p-1.5 rounded ${view === "table" ? "bg-accent" : ""}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Forçar sincronização
            </button>
          </>
        }
      />

      {list.length === 0 ? (
        <EmptyPanel title="Sem telas" hint="Cadastre telas para monitorar." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {list.map((s) => {
            const health = screenHealthPercent(s);
            const lastPing = s.last_seen_at ?? new Date().toISOString();
            return (
              <div
                key={s.id}
                className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:border-primary/40 hover:shadow-glow transition-smooth"
              >
                <div className="relative aspect-video bg-gradient-surface overflow-hidden">
                  {!s.is_online ? (
                    <div className="w-full h-full grid place-items-center">
                      <WifiOff className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  ) : (
                    <img
                      src={`https://picsum.photos/seed/${s.id}/640/360`}
                      alt=""
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={s.device_status} />
                  </div>
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-md px-2 py-0.5 text-[10px] text-white font-mono">
                    {s.resolution ?? "—"}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white">
                    <span className="rounded bg-black/50 backdrop-blur-md px-1.5 py-0.5">
                      {s.platform ?? "—"}
                    </span>
                    <span className="rounded bg-black/50 backdrop-blur-md px-1.5 py-0.5 font-mono">
                      {s.player_version ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {s.units?.name ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Saúde</p>
                      <p
                        className={`text-sm font-bold ${health > 80 ? "text-success" : health > 50 ? "text-warning" : "text-destructive"}`}
                      >
                        {health}%
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <p className="truncate">
                      <span className="text-foreground/80">Em exibição:</span>{" "}
                      {s.campaigns?.name ?? "—"}
                    </p>
                    <p className="mt-0.5">
                      Último ping{" "}
                      {formatDistanceToNow(new Date(lastPing), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    <button
                      type="button"
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent transition-smooth"
                    >
                      <Eye className="h-3 w-3" /> Detalhes
                    </button>
                    <button
                      type="button"
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-[11px] hover:bg-primary/20 transition-smooth"
                    >
                      <RefreshCw className="h-3 w-3" /> Sync
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                {list.map((s) => {
                  const health = screenHealthPercent(s);
                  const lastPing = s.last_seen_at ?? new Date().toISOString();
                  const lastSync = s.last_sync_at ?? lastPing;
                  return (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-surface/40">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                        {s.name}
                      </td>
                      <td className="px-4 py-3">{s.units?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.device_status} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            health > 80
                              ? "text-success"
                              : health > 50
                                ? "text-warning"
                                : "text-destructive"
                          }
                        >
                          {health}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDistanceToNow(new Date(lastPing), { locale: ptBR, addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDistanceToNow(new Date(lastSync), { locale: ptBR, addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 truncate max-w-xs">{s.campaigns?.name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
