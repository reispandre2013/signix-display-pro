import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useScreens, useUnits, useCampaigns } from "@/lib/hooks/use-supabase-data";
import { useAuth } from "@/lib/auth-context";
import { reconcileScreenStatuses } from "@/lib/server/player.functions";
import {
  RefreshCw,
  MonitorSmartphone,
  WifiOff,
  Eye,
  LayoutGrid,
  List,
  Tv,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/monitoramento")({
  head: () => ({ meta: [{ title: "Monitoramento — Signix" }] }),
  component: MonitorPage,
});

function MonitorPage() {
  const { data: screens = [], isLoading, error, refetch, isFetching } = useScreens();
  const { data: units = [] } = useUnits();
  const { data: campaigns = [] } = useCampaigns();
  const [view, setView] = useState<"grid" | "table">("grid");
  const qc = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  const reconcileFn = useServerFn(reconcileScreenStatuses);

  // Auto-refresh + reconcile (marca offline telas sem ping > 2min)
  useEffect(() => {
    const tick = async () => {
      try {
        await reconcileFn({ data: {} });
      } catch (e) {
        console.warn("[reconcile] falhou:", e);
      }
      qc.invalidateQueries({ queryKey: ["screens", orgId] });
    };
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, [orgId, qc, reconcileFn]);

  const handleSync = async () => {
    try {
      await reconcileFn({ data: {} }).catch(() => null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["screens", orgId] }),
        qc.invalidateQueries({ queryKey: ["units", orgId] }),
        qc.invalidateQueries({ queryKey: ["campaigns", orgId] }),
      ]);
      await refetch();
      toast.success("Dados sincronizados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar.");
    }
  };

  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name ?? "Sem unidade";
  const campaignName = (id: string | null) =>
    campaigns.find((c) => c.id === id)?.name ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoramento em tempo real"
        subtitle="Saúde, status e atividade de cada player."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> Live
            </span>
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
              <button onClick={() => setView("grid")} className={`p-1.5 rounded ${view === "grid" ? "bg-accent" : ""}`}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setView("table")} className={`p-1.5 rounded ${view === "table" ? "bg-accent" : ""}`}>
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={handleSync}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sincronizar
            </button>
          </>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : screens.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Tv}
            title="Nenhuma tela cadastrada"
            description="Adicione players na seção Telas para monitorá-los aqui."
          />
        </Panel>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {screens.map((s) => {
            const offline = s.device_status === "offline" || !s.is_online;
            return (
              <div
                key={s.id}
                className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:border-primary/40 hover:shadow-glow transition-smooth"
              >
                <div className="relative aspect-video bg-gradient-surface overflow-hidden">
                  <div className="w-full h-full grid place-items-center">
                    {offline ? (
                      <WifiOff className="h-10 w-10 text-muted-foreground/40" />
                    ) : (
                      <Tv className="h-10 w-10 text-primary/40" />
                    )}
                  </div>
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={s.device_status} />
                  </div>
                  {s.resolution && (
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/50 backdrop-blur-md px-2 py-0.5 text-[10px] text-white font-mono">
                      {s.resolution}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white">
                    <span className="rounded bg-black/50 backdrop-blur-md px-1.5 py-0.5">{s.platform ?? "—"}</span>
                    <span className="rounded bg-black/50 backdrop-blur-md px-1.5 py-0.5 font-mono">
                      {s.player_version ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{unitName(s.unit_id)}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <p className="truncate">
                      <span className="text-foreground/80">Em exibição:</span>{" "}
                      {campaignName(s.current_campaign_id) ?? "—"}
                    </p>
                    <p className="mt-0.5">
                      Último ping{" "}
                      {s.last_seen_at
                        ? formatDistanceToNow(new Date(s.last_seen_at), { locale: ptBR, addSuffix: true })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent transition-smooth">
                      <Eye className="h-3 w-3" /> Detalhes
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
                  <th className="px-4 py-2.5 text-left">Último ping</th>
                  <th className="px-4 py-2.5 text-left">Sync</th>
                  <th className="px-4 py-2.5 text-left">Campanha</th>
                </tr>
              </thead>
              <tbody>
                {screens.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface/40">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                      {s.name}
                    </td>
                    <td className="px-4 py-3">{unitName(s.unit_id)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.device_status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.last_seen_at
                        ? formatDistanceToNow(new Date(s.last_seen_at), { locale: ptBR, addSuffix: true })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.last_sync_at
                        ? formatDistanceToNow(new Date(s.last_sync_at), { locale: ptBR, addSuffix: true })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 truncate max-w-xs">
                      {campaignName(s.current_campaign_id) ?? "—"}
                    </td>
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
