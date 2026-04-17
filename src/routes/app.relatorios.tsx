import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCampaigns, useScreens, useUnits, useAlerts } from "@/lib/hooks/use-supabase-data";
import { Download, Filter, BarChart3 } from "lucide-react";
import { format, subDays } from "date-fns";

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

function ReportsPage() {
  const { data: campaigns = [], isLoading, error } = useCampaigns();
  const { data: screens = [] } = useScreens();
  const { data: units = [] } = useUnits();
  const { data: alerts = [] } = useAlerts();

  // Sintetiza séries a partir dos dados reais (placeholder até playback_logs)
  const exhibitionsByDay = Array.from({ length: 14 }).map((_, i) => {
    const date = subDays(new Date(), 13 - i);
    return {
      date: format(date, "dd/MM"),
      exibicoes: Math.max(0, screens.length * 30 + ((i * 17) % 80)),
      falhas: alerts.length > 0 ? (i % 5) : 0,
    };
  });

  const statusByUnit = units.slice(0, 6).map((u) => {
    const us = screens.filter((s) => s.unit_id === u.id);
    return {
      name: u.name.slice(0, 12),
      online: us.filter((s) => s.is_online).length,
      offline: us.filter((s) => !s.is_online).length,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores de exibição, falhas e performance da rede."
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
              <Download className="h-3.5 w-3.5" /> Exportar PDF
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Telas ativas", v: screens.filter((s) => s.is_online).length, d: `de ${screens.length} totais` },
          { l: "Campanhas ativas", v: campaigns.filter((c) => c.status === "active").length, d: `de ${campaigns.length} totais` },
          { l: "Alertas pendentes", v: alerts.filter((a) => !a.resolved_at).length, d: "necessitam atenção" },
          { l: "Unidades", v: units.length, d: "no total" },
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
                <XAxis dataKey="date" stroke="oklch(0.66 0.025 248)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.66 0.025 248)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="exibicoes" stroke="oklch(0.68 0.19 252)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Status por unidade">
          <div className="h-64">
            {statusByUnit.length === 0 ? (
              <EmptyState icon={BarChart3} title="Sem dados" description="Cadastre unidades e telas para ver este gráfico." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusByUnit}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.025 252 / 30%)" />
                  <XAxis dataKey="name" stroke="oklch(0.66 0.025 248)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.66 0.025 248)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="online" stackId="a" fill="oklch(0.72 0.18 158)" name="Online" />
                  <Bar dataKey="offline" stackId="a" fill="oklch(0.62 0.22 22)" radius={[4, 4, 0, 0]} name="Offline" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Campanhas" bodyClassName="p-0">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : campaigns.length === 0 ? (
          <EmptyState icon={BarChart3} title="Nenhuma campanha" description="Crie campanhas para ver métricas aqui." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left">Campanha</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Prioridade</th>
                <th className="px-5 py-3 text-left">Início</th>
                <th className="px-5 py-3 text-left">Fim</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-surface/40">
                  <td className="px-5 py-3.5 font-medium">{c.name}</td>
                  <td className="px-5 py-3.5">{c.status}</td>
                  <td className="px-5 py-3.5 font-mono">{c.priority}</td>
                  <td className="px-5 py-3.5">{format(new Date(c.start_at), "dd/MM/yyyy")}</td>
                  <td className="px-5 py-3.5">{format(new Date(c.end_at), "dd/MM/yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
