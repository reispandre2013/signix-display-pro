import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Monitor,
  Wifi,
  WifiOff,
  AlertTriangle,
  Megaphone,
  ImageIcon,
  ListVideo,
  Activity,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { KpiCard } from "@/components/ui-kit/KpiCard";
import { Panel } from "@/components/ui-kit/Panel";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useAlertsQuery,
  useCampaignsQuery,
  useMediaQuery,
  usePlaylistsQuery,
  usePlaybackReportQuery,
  useProfileQuery,
  useScreensQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Signix" }] }),
  component: Dashboard,
});

type ScreenRow = {
  id: string;
  name: string;
  is_online: boolean;
  device_status: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
  units: { name: string } | null;
};

function Dashboard() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: loadingProfile, error: profileError, refetch: refetchProfile } =
    useProfileQuery();
  const orgId = profile?.organization_id;

  const { data: screens = [], isLoading: loadingScreens } = useScreensQuery(orgId);
  const { data: campaigns = [] } = useCampaignsQuery(orgId);
  const { data: media = [] } = useMediaQuery(orgId);
  const { data: playlists = [] } = usePlaylistsQuery(orgId);
  const { data: alerts = [] } = useAlertsQuery(orgId);

  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString();
  }, []);
  const { data: playback = [] } = usePlaybackReportQuery(orgId, sinceIso);

  const typedScreens = screens as ScreenRow[];

  const stats = useMemo(() => {
    const total = typedScreens.length;
    const online = typedScreens.filter((s) => s.is_online).length;
    const offline = typedScreens.filter((s) => !s.is_online).length;
    const warning = typedScreens.filter((s) => s.device_status === "warning").length;
    const activeCamp = campaigns.filter((c: { status: string }) => c.status === "active").length;
    return {
      total,
      online,
      offline,
      warning,
      campaigns: activeCamp,
      media: media.length,
      playlists: playlists.length,
    };
  }, [typedScreens, campaigns, media, playlists]);

  const exhibitionsByDay = useMemo(() => {
    const map = new Map<string, { exibicoes: number; falhas: number }>();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = format(d, "dd/MM");
      map.set(key, { exibicoes: 0, falhas: 0 });
    }
    for (const row of playback as { played_at: string; playback_status: string }[]) {
      const key = format(new Date(row.played_at), "dd/MM");
      if (!map.has(key)) map.set(key, { exibicoes: 0, falhas: 0 });
      const cur = map.get(key)!;
      if (row.playback_status === "failed" || row.playback_status === "skipped") cur.falhas += 1;
      else cur.exibicoes += 1;
    }
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  }, [playback]);

  const statusByUnit = useMemo(() => {
    const acc = new Map<string, { online: number; offline: number }>();
    for (const s of typedScreens) {
      const name = s.units?.name ?? "—";
      if (!acc.has(name)) acc.set(name, { online: 0, offline: 0 });
      const v = acc.get(name)!;
      if (s.is_online) v.online += 1;
      else v.offline += 1;
    }
    return Array.from(acc.entries()).map(([name, v]) => ({
      name: name.replace(/^Filial /, "").replace(/^Matriz /, ""),
      ...v,
    }));
  }, [typedScreens]);

  const activeCampaigns = useMemo(
    () =>
      campaigns
        .filter((c: { status: string }) => c.status === "active")
        .slice(0, 5)
        .map((c: { id: string; name: string; playlists?: { name: string } | null; priority?: number }) => ({
          id: c.id,
          name: c.name,
          playlistName: c.playlists?.name ?? "—",
          screens: 0,
          units: 0,
          priority: String(c.priority ?? "—"),
        })),
    [campaigns],
  );

  const problemDevices = useMemo(
    () =>
      typedScreens
        .filter((s) => !s.is_online || s.device_status === "warning")
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          name: s.name,
          unit: s.units?.name ?? "—",
          lastPing: s.last_seen_at ?? new Date().toISOString(),
          status: s.device_status,
        })),
    [typedScreens],
  );

  const recentAlerts = useMemo(
    () =>
      alerts.slice(0, 5).map(
        (a: {
          id: string;
          alert_type: string;
          message: string;
          severity: string;
          created_at: string;
          resolved_at: string | null;
          screens: { name: string } | null;
        }) => ({
          id: a.id,
          type: a.alert_type,
          screen: a.screens?.name ?? "—",
          date: a.created_at,
          severity: a.severity as "low" | "medium" | "high" | "critical",
          resolved: !!a.resolved_at,
        }),
      ),
    [alerts],
  );

  const recentSync = useMemo(
    () =>
      [...typedScreens]
        .filter((s) => s.last_sync_at)
        .sort(
          (a, b) =>
            new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime(),
        )
        .slice(0, 5),
    [typedScreens],
  );

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Visão geral" subtitle="Conecte o Supabase para ver dados reais." />
        <EmptyPanel title="Sem conexão" hint="Defina as variáveis de ambiente do Supabase." />
      </div>
    );
  }

  if (profileError) {
    return (
      <ErrorPanel
        message={profileError instanceof Error ? profileError.message : "Erro ao carregar perfil."}
        onRetry={() => void refetchProfile()}
      />
    );
  }

  if (loadingProfile || (orgId && loadingScreens)) {
    return <LoadingPanel title="Carregando dashboard" />;
  }

  if (!profile || !orgId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Visão geral" subtitle="Perfil não encontrado." />
        <EmptyPanel
          title="Sem perfil"
          hint="Crie um registro em profiles vinculado ao seu usuário e organização no Supabase."
        />
      </div>
    );
  }

  const pctOnline = stats.total ? Math.round((stats.online / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        subtitle="Resumo operacional de todas as suas telas, campanhas e dispositivos."
        actions={
          <>
            <button
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent transition-smooth"
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              <Zap className="h-3.5 w-3.5" /> Sincronizar tudo
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Telas cadastradas"
          value={stats.total}
          icon={Monitor}
          tone="primary"
          delta={{ value: "+0", up: true }}
        />
        <KpiCard
          label="Online agora"
          value={stats.online}
          icon={Wifi}
          tone="success"
          delta={{ value: "+0%", up: true }}
          hint={`${pctOnline}% disponibilidade`}
        />
        <KpiCard
          label="Offline"
          value={stats.offline}
          icon={WifiOff}
          tone="destructive"
          delta={{ value: "+0", up: false }}
        />
        <KpiCard
          label="Em atenção"
          value={stats.warning}
          icon={AlertTriangle}
          tone="warning"
          hint="Saúde abaixo de 70%"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Campanhas ativas"
          value={stats.campaigns}
          icon={Megaphone}
          tone="info"
          delta={{ value: "+0", up: true }}
        />
        <KpiCard label="Mídias na biblioteca" value={stats.media} icon={ImageIcon} tone="primary" />
        <KpiCard label="Playlists" value={stats.playlists} icon={ListVideo} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Exibições nos últimos 14 dias"
          description="Volume de exibições e falhas de reprodução por dia."
          actions={
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground">
              Exportar
            </button>
          }
        >
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
                <XAxis
                  dataKey="date"
                  stroke="oklch(0.66 0.025 248)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.66 0.025 248)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.022 252)",
                    border: "1px solid oklch(0.28 0.025 252)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "oklch(0.97 0.004 240)" }}
                />
                <Area
                  type="monotone"
                  dataKey="exibicoes"
                  stroke="oklch(0.68 0.19 252)"
                  strokeWidth={2}
                  fill="url(#exibG)"
                  name="Exibições"
                />
                <Area
                  type="monotone"
                  dataKey="falhas"
                  stroke="oklch(0.62 0.22 22)"
                  strokeWidth={2}
                  fill="url(#falG)"
                  name="Falhas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Status por unidade" description="Telas online vs. offline por filial.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusByUnit.length ? statusByUnit : [{ name: "—", online: 0, offline: 0 }]} layout="vertical" barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="oklch(0.28 0.025 252 / 30%)" />
                <XAxis
                  type="number"
                  stroke="oklch(0.66 0.025 248)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="oklch(0.66 0.025 248)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.022 252)",
                    border: "1px solid oklch(0.28 0.025 252)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="online"
                  stackId="a"
                  fill="oklch(0.72 0.18 158)"
                  radius={[0, 0, 0, 0]}
                  name="Online"
                />
                <Bar
                  dataKey="offline"
                  stackId="a"
                  fill="oklch(0.62 0.22 22)"
                  radius={[0, 4, 4, 0]}
                  name="Offline"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="Campanhas em execução"
          description="Veiculações ativas no momento."
          actions={
            <Link
              to="/app/campanhas"
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="divide-y divide-border -my-3">
            {activeCampaigns.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma campanha ativa.</li>
            ) : (
              activeCampaigns.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.playlistName} · {c.screens} telas · {c.units} unidades
                    </p>
                  </div>
                  <StatusBadge tone="primary" label={c.priority} withDot={false} />
                  <StatusBadge tone="success" label="Ativa" />
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel
          title="Dispositivos com problema"
          description="Telas offline ou em atenção."
          actions={
            <Link
              to="/app/monitoramento"
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
            >
              Monitorar <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="divide-y divide-border -my-3">
            {problemDevices.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted-foreground">Nenhum dispositivo em problema.</li>
            ) : (
              problemDevices.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-lg bg-destructive/10 grid place-items-center text-destructive">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.unit} · ping{" "}
                      {formatDistanceToNow(new Date(s.lastPing), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="Alertas recentes"
          description="Últimos eventos detectados pelos players."
          actions={
            <Link
              to="/app/alertas"
              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <ul className="space-y-3">
            {recentAlerts.length === 0 ? (
              <li className="text-center text-sm text-muted-foreground py-6">Sem alertas.</li>
            ) : (
              recentAlerts.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full ${a.severity === "critical" ? "bg-destructive" : a.severity === "high" ? "bg-warning" : "bg-info"} pulse-dot`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.screen} ·{" "}
                      {formatDistanceToNow(new Date(a.date), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge
                    tone={a.resolved ? "success" : "warning"}
                    label={a.resolved ? "Resolvido" : "Pendente"}
                    withDot={false}
                  />
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel title="Últimas sincronizações" description="Telas que sincronizaram conteúdo recentemente.">
          <ul className="space-y-3">
            {recentSync.length === 0 ? (
              <li className="text-center text-sm text-muted-foreground py-6">Sem registros de sync.</li>
            ) : (
              recentSync.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-success" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.units?.name ?? "—"}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                    <Clock className="h-3 w-3" />{" "}
                    {s.last_sync_at ? format(new Date(s.last_sync_at), "HH:mm") : "—"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
