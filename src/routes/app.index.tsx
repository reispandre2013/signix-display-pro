import { createFileRoute, Link } from "@tanstack/react-router";
import { Monitor, Wifi, WifiOff, AlertTriangle, Megaphone, ImageIcon, ListVideo, Activity, ArrowRight, Clock, Zap, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { KpiCard } from "@/components/ui-kit/KpiCard";
import { Panel } from "@/components/ui-kit/Panel";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState } from "@/components/ui-kit/States";
import {
  useScreens, useCampaigns, useAlerts, useMedia, usePlaylists,
} from "@/lib/hooks/use-supabase-data";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Signix" }] }),
  component: Dashboard,
});

function Dashboard() {
  const screensQ = useScreens();
  const campaignsQ = useCampaigns();
  const alertsQ = useAlerts();
  const mediaQ = useMedia();
  const playlistsQ = usePlaylists();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;

  const isSyncing =
    screensQ.isFetching ||
    campaignsQ.isFetching ||
    alertsQ.isFetching ||
    mediaQ.isFetching ||
    playlistsQ.isFetching;

  const handleSyncAll = async () => {
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["screens", orgId] }),
        qc.invalidateQueries({ queryKey: ["campaigns", orgId] }),
        qc.invalidateQueries({ queryKey: ["alerts", orgId] }),
        qc.invalidateQueries({ queryKey: ["media", orgId] }),
        qc.invalidateQueries({ queryKey: ["playlists", orgId] }),
      ]);
      await Promise.all([
        screensQ.refetch(),
        campaignsQ.refetch(),
        alertsQ.refetch(),
        mediaQ.refetch(),
        playlistsQ.refetch(),
      ]);
      toast.success("Dados sincronizados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar.");
    }
  };

  const screens = screensQ.data ?? [];
  const campaigns = campaignsQ.data ?? [];
  const alerts = alertsQ.data ?? [];

  const total = screens.length;
  const online = screens.filter((s) => s.is_online).length;
  const offline = screens.filter((s) => s.device_status === "offline").length;
  const warning = screens.filter((s) => s.device_status === "warning").length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active");

  // série de exibições simulada a partir de heartbeat — sem playback_logs ainda usamos contagem
  const exhibitionsByDay = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i);
    return {
      date: format(d, "dd/MM"),
      exibicoes: total * (8 + (i % 5)),
      falhas: Math.max(0, offline - (i % 3)),
    };
  });

  const recentAlerts = alerts.slice(0, 5);
  const problemDevices = screens.filter((s) => s.device_status === "offline" || s.device_status === "warning").slice(0, 5);
  const recentSync = [...screens]
    .filter((s) => s.last_sync_at)
    .sort((a, b) => +new Date(b.last_sync_at!) - +new Date(a.last_sync_at!))
    .slice(0, 5);

  const isLoading = screensQ.isLoading || campaignsQ.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        subtitle="Resumo operacional de todas as suas telas, campanhas e dispositivos."
        actions={
          <>
            <button className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent transition-smooth">Últimos 7 dias</button>
            <button onClick={() => { screensQ.refetch(); campaignsQ.refetch(); }} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
              <Zap className="h-3.5 w-3.5" /> Sincronizar tudo
            </button>
          </>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Telas cadastradas" value={total} icon={Monitor} tone="primary" />
            <KpiCard label="Online agora" value={online} icon={Wifi} tone="success" hint={total ? `${Math.round((online / total) * 100)}% disponibilidade` : "—"} />
            <KpiCard label="Offline" value={offline} icon={WifiOff} tone="destructive" />
            <KpiCard label="Em atenção" value={warning} icon={AlertTriangle} tone="warning" hint="Saúde abaixo de 70%" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="Campanhas ativas" value={activeCampaigns.length} icon={Megaphone} tone="info" />
            <KpiCard label="Mídias na biblioteca" value={mediaQ.data?.length ?? 0} icon={ImageIcon} tone="primary" />
            <KpiCard label="Playlists" value={playlistsQ.data?.length ?? 0} icon={ListVideo} tone="success" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel className="lg:col-span-2" title="Exibições nos últimos 14 dias" description="Estimativa baseada no parque de telas e ocorrências.">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={exhibitionsByDay}>
                    <defs>
                      <linearGradient id="exibG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.68 0.19 252)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="oklch(0.68 0.19 252)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="falG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.62 0.22 22)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="oklch(0.62 0.22 22)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.025 252 / 30%)" />
                    <XAxis dataKey="date" stroke="oklch(0.66 0.025 248)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.66 0.025 248)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "oklch(0.21 0.022 252)", border: "1px solid oklch(0.28 0.025 252)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="exibicoes" stroke="oklch(0.68 0.19 252)" strokeWidth={2} fill="url(#exibG)" name="Exibições" />
                    <Area type="monotone" dataKey="falhas" stroke="oklch(0.62 0.22 22)" strokeWidth={2} fill="url(#falG)" name="Falhas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Status dos dispositivos" description="Distribuição por status atual.">
              <div className="space-y-3 text-sm">
                <Bar label="Online" value={online} total={total} color="bg-success" />
                <Bar label="Offline" value={offline} total={total} color="bg-destructive" />
                <Bar label="Atenção" value={warning} total={total} color="bg-warning" />
                <Bar label="Sincronizando" value={screens.filter(s => s.device_status === "syncing").length} total={total} color="bg-info" />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel
              title="Campanhas em execução"
              description="Veiculações ativas no momento."
              actions={<Link to="/app/campanhas" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">Ver todas <ArrowRight className="h-3 w-3" /></Link>}
            >
              {activeCampaigns.length === 0 ? (
                <EmptyState title="Nenhuma campanha ativa" description="Crie ou ative uma campanha para começar a exibir." icon={Megaphone} />
              ) : (
                <ul className="divide-y divide-border -my-3">
                  {activeCampaigns.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><Megaphone className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">Prioridade {c.priority}</p>
                      </div>
                      <StatusBadge tone="success" label="Ativa" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Dispositivos com problema"
              description="Telas offline ou em atenção."
              actions={<Link to="/app/monitoramento" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">Monitorar <ArrowRight className="h-3 w-3" /></Link>}
            >
              {problemDevices.length === 0 ? (
                <EmptyState title="Tudo normal" description="Nenhum dispositivo offline ou em atenção." icon={Wifi} />
              ) : (
                <ul className="divide-y divide-border -my-3">
                  {problemDevices.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <div className="h-9 w-9 rounded-lg bg-destructive/10 grid place-items-center text-destructive"><Monitor className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.last_seen_at ? `visto ${formatDistanceToNow(new Date(s.last_seen_at), { locale: ptBR, addSuffix: true })}` : "nunca conectou"}
                        </p>
                      </div>
                      <StatusBadge tone={s.device_status === "offline" ? "destructive" : "warning"} label={s.device_status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel
              title="Alertas recentes"
              description="Últimos eventos detectados."
              actions={<Link to="/app/alertas" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">Ver todos <ArrowRight className="h-3 w-3" /></Link>}
            >
              {recentAlerts.length === 0 ? (
                <EmptyState title="Nenhum alerta" description="Tudo em ordem por aqui." />
              ) : (
                <ul className="space-y-3">
                  {recentAlerts.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full ${a.severity === "critical" ? "bg-destructive" : a.severity === "high" ? "bg-warning" : "bg-info"} pulse-dot`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.alert_type}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { locale: ptBR, addSuffix: true })}</p>
                      </div>
                      <StatusBadge tone={a.resolved_at ? "success" : "warning"} label={a.resolved_at ? "Resolvido" : "Pendente"} withDot={false} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Últimas sincronizações" description="Telas que sincronizaram conteúdo recentemente.">
              {recentSync.length === 0 ? (
                <EmptyState title="Nenhuma sincronização registrada" />
              ) : (
                <ul className="space-y-3">
                  {recentSync.map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-success" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <Clock className="h-3 w-3" /> {format(new Date(s.last_sync_at!), "HH:mm")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground font-mono">{value} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
