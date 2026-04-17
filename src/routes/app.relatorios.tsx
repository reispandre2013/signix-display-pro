import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useCampaignsQuery,
  usePlaybackReportQuery,
  useProfileQuery,
  useScreensQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Signix" }] }),
  component: ReportsPage,
});

const tooltipStyle = {
  background: "oklch(0.21 0.022 252)",
  border: "1px solid oklch(0.28 0.025 252)",
  borderRadius: 8,
  fontSize: 12,
};

type ScreenRow = {
  id: string;
  is_online: boolean;
  device_status: string;
  units: { name: string } | null;
};

function ReportsPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;

  const sinceIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString();
  }, []);

  const { data: playback = [], isLoading: lpb, error: pbe, refetch: rfPb } = usePlaybackReportQuery(
    orgId,
    sinceIso,
  );
  const { data: screens = [], isLoading: lsc, error: sce, refetch: rfSc } = useScreensQuery(orgId);
  const { data: campaigns = [], isLoading: lcm, error: cme, refetch: rfCm } = useCampaignsQuery(orgId);

  const typedScreens = screens as ScreenRow[];

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

  const totals = useMemo(() => {
    let ex = 0;
    let fail = 0;
    for (const row of playback as { playback_status: string }[]) {
      if (row.playback_status === "failed" || row.playback_status === "skipped") fail += 1;
      else ex += 1;
    }
    const online = typedScreens.filter((s) => s.is_online).length;
    return { ex, fail, screens: typedScreens.length, online };
  }, [playback, typedScreens]);

  const loading = lp || lpb || lsc || lcm;
  const err = pe || pbe || sce || cme;

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Relatórios" subtitle="Modo preview." />
        <EmptyPanel title="Relatórios" hint="Conecte o Supabase para métricas ao vivo." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relatórios" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relatórios" subtitle="Erro" />
        <ErrorPanel
          message={err.message}
          onRetry={() => {
            void rfP();
            void rfPb();
            void rfSc();
            void rfCm();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores de exibição, falhas e performance da rede."
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Filter className="h-3.5 w-3.5" /> Filtros
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              <Download className="h-3.5 w-3.5" /> Exportar PDF
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Exibições (14d)", v: totals.ex.toLocaleString("pt-BR"), d: "Playback logs no período" },
          { l: "Falhas / pulos", v: totals.fail.toLocaleString("pt-BR"), d: "Status failed ou skipped" },
          { l: "Telas cadastradas", v: String(totals.screens), d: `${totals.online} online` },
          { l: "Campanhas", v: String(campaigns.length), d: "Total na organização" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.v}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Exibições por período">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exhibitionsByDay}>
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
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="exibicoes"
                  stroke="oklch(0.68 0.19 252)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Status por unidade">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusByUnit.length ? statusByUnit : [{ name: "—", online: 0, offline: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.025 252 / 30%)" />
                <XAxis
                  dataKey="name"
                  stroke="oklch(0.66 0.025 248)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.66 0.025 248)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="online" stackId="a" fill="oklch(0.72 0.18 158)" name="Online" />
                <Bar
                  dataKey="offline"
                  stackId="a"
                  fill="oklch(0.62 0.22 22)"
                  radius={[4, 4, 0, 0]}
                  name="Offline"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Campanhas (cadastro)" bodyClassName="p-0">
        {campaigns.length === 0 ? (
          <div className="p-6">
            <EmptyPanel title="Sem campanhas" hint="" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left">Campanha</th>
                <th className="px-5 py-3 text-left">Prioridade</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Período</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns as { id: string; name: string; priority: number; status: string; start_at: string; end_at: string }[]).map(
                (c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-surface/40">
                    <td className="px-5 py-3.5 font-medium">{c.name}</td>
                    <td className="px-5 py-3.5">{c.priority}</td>
                    <td className="px-5 py-3.5">{c.status}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">
                      {format(new Date(c.start_at), "dd/MM/yy", { locale: ptBR })} –{" "}
                      {format(new Date(c.end_at), "dd/MM/yy", { locale: ptBR })}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
