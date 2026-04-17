import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useScreens, useUnits, useDeleteScreen } from "@/lib/hooks/use-supabase-data";
import { Plus, Search, MonitorSmartphone, MapPin, Cpu, Trash2, MonitorOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/telas")({
  head: () => ({ meta: [{ title: "Telas e Players — Signix" }] }),
  component: ScreensPage,
});

function ScreensPage() {
  const screensQ = useScreens();
  const unitsQ = useUnits();
  const del = useDeleteScreen();
  const [q, setQ] = useState("");

  const screens = screensQ.data ?? [];
  const units = unitsQ.data ?? [];
  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name ?? "—";

  const filtered = useMemo(
    () => screens.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.pairing_code?.toLowerCase().includes(q.toLowerCase())),
    [screens, q],
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir tela "${name}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Tela excluída.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telas / Players"
        subtitle="Gerencie todos os dispositivos físicos conectados ao Signix."
        actions={
          <Link to="/pareamento" className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Adicionar tela
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Total", v: screens.length },
          { l: "Online", v: screens.filter((s) => s.is_online).length },
          { l: "Offline", v: screens.filter((s) => s.device_status === "offline").length },
          { l: "Atenção", v: screens.filter((s) => s.device_status === "warning").length },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      <Panel
        title={`${filtered.length} dispositivos`}
        description="Lista completa com filtros e busca."
        actions={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, código…" className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        }
        bodyClassName="p-0"
      >
        {screensQ.isLoading ? (
          <LoadingState />
        ) : screensQ.error ? (
          <div className="p-4"><ErrorState error={screensQ.error} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma tela cadastrada"
            description="Pareie um novo player para começar a exibir conteúdo."
            icon={MonitorOff}
            action={
              <Link to="/pareamento" className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
                <Plus className="h-3.5 w-3.5" /> Parear novo player
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Th>Tela</Th><Th>Unidade</Th><Th>Status</Th><Th>Plataforma</Th><Th>Resolução</Th><Th>Último ping</Th><th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface/40">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center"><MonitorSmartphone className="h-4 w-4 text-primary" /></div>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{s.pairing_code ?? "—"}</p>
                        </div>
                      </div>
                    </Td>
                    <Td><span className="inline-flex items-center gap-1 text-xs"><MapPin className="h-3 w-3 text-muted-foreground" />{unitName(s.unit_id)}</span></Td>
                    <Td><StatusBadge tone={s.is_online ? "success" : s.device_status === "warning" ? "warning" : "destructive"} label={s.device_status} /></Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-xs"><Cpu className="h-3 w-3 text-muted-foreground" />{s.platform ?? "—"}</span>
                      <p className="text-[10px] text-muted-foreground font-mono">{s.player_version ?? ""}</p>
                    </Td>
                    <Td><span className="text-xs font-mono">{s.resolution ?? "—"}</span><p className="text-[10px] text-muted-foreground">{s.orientation}</p></Td>
                    <Td><span className="text-xs text-muted-foreground">{s.last_seen_at ? formatDistanceToNow(new Date(s.last_seen_at), { locale: ptBR, addSuffix: true }) : "nunca"}</span></Td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(s.id, s.name)} className="h-7 w-7 grid place-items-center rounded-md hover:bg-destructive/10 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
