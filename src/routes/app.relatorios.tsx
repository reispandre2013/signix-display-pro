import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
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
import { exhibitionsByDay, statusByUnit, mockScreens, mockCampaigns } from "@/lib/mock-data";
import { Download, Filter } from "lucide-react";

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
          { l: "Exibições totais", v: "284.5k", d: "+12% vs período anterior" },
          { l: "Tempo total exibido", v: "1.842h", d: "76 dias acumulados" },
          { l: "Falhas de reprodução", v: "127", d: "-23% vs período" },
          { l: "Telas mais ativas", v: mockScreens.length, d: "Acima de 95% saúde" },
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
              <BarChart data={statusByUnit}>
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

      <Panel title="Top campanhas por exibição" bodyClassName="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-left">Campanha</th>
              <th className="px-5 py-3 text-left">Telas</th>
              <th className="px-5 py-3 text-left">Exibições</th>
              <th className="px-5 py-3 text-left">Tempo total</th>
              <th className="px-5 py-3 text-left">Performance</th>
            </tr>
          </thead>
          <tbody>
            {mockCampaigns.map((c, i) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-surface/40">
                <td className="px-5 py-3.5 font-medium">{c.name}</td>
                <td className="px-5 py-3.5">{c.screens}</td>
                <td className="px-5 py-3.5 font-mono">
                  {(15000 - i * 1200).toLocaleString("pt-BR")}
                </td>
                <td className="px-5 py-3.5 font-mono">{120 - i * 8}h</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 w-32">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary"
                        style={{ width: `${100 - i * 10}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono w-8 text-right">{100 - i * 10}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
