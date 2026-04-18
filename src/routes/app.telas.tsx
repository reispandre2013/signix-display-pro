import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useScreens, useUnits, useDeleteScreen } from "@/lib/hooks/use-supabase-data";
import {
  Plus,
  Search,
  MonitorSmartphone,
  MapPin,
  Cpu,
  Trash2,
  MonitorOff,
  Loader2,
  Tv,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { claimPairingCode } from "@/lib/server/screens.functions";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/telas")({
  head: () => ({ meta: [{ title: "Telas e Players — Signix" }] }),
  component: ScreensPage,
});

function ScreensPage() {
  const screensQ = useScreens();
  const unitsQ = useUnits();
  const del = useDeleteScreen();
  const [q, setQ] = useState("");
  const [pairOpen, setPairOpen] = useState(false);

  const screens = screensQ.data ?? [];
  const units = unitsQ.data ?? [];
  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name ?? "—";

  const filtered = useMemo(
    () =>
      screens.filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          s.pairing_code?.toLowerCase().includes(q.toLowerCase()),
      ),
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
          <button
            onClick={() => setPairOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar tela
          </button>
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
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, código…"
              className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        }
        bodyClassName="p-0"
      >
        {screensQ.isLoading ? (
          <LoadingState />
        ) : screensQ.error ? (
          <div className="p-4">
            <ErrorState error={screensQ.error} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma tela cadastrada"
            description="Abra a tela /pareamento na TV/player e use o código exibido para vincular o dispositivo."
            icon={MonitorOff}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setPairOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
                >
                  <Plus className="h-3.5 w-3.5" /> Parear novo player
                </button>
                <Link
                  to="/pareamento"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:bg-accent transition-smooth"
                >
                  <Tv className="h-3.5 w-3.5" /> Abrir modo player
                </Link>
              </div>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Th>Tela</Th>
                  <Th>Unidade</Th>
                  <Th>Status</Th>
                  <Th>Plataforma</Th>
                  <Th>Resolução</Th>
                  <Th>Último ping</Th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface/40">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center">
                          <MonitorSmartphone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {s.pairing_code ?? "—"}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {unitName(s.unit_id)}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge
                        tone={
                          s.is_online
                            ? "success"
                            : s.device_status === "warning"
                              ? "warning"
                              : "destructive"
                        }
                        label={s.device_status}
                      />
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Cpu className="h-3 w-3 text-muted-foreground" />
                        {s.platform ?? "—"}
                      </span>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {s.player_version ?? ""}
                      </p>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">{s.resolution ?? "—"}</span>
                      <p className="text-[10px] text-muted-foreground">{s.orientation}</p>
                    </Td>
                    <Td>
                      <span className="text-xs text-muted-foreground">
                        {s.last_seen_at
                          ? formatDistanceToNow(new Date(s.last_seen_at), {
                              locale: ptBR,
                              addSuffix: true,
                            })
                          : "nunca"}
                      </span>
                    </Td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="h-7 w-7 grid place-items-center rounded-md hover:bg-destructive/10 text-destructive"
                      >
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

      {pairOpen && <PairScreenModal onClose={() => setPairOpen(false)} units={units} />}
    </div>
  );
}

function PairScreenModal({
  onClose,
  units,
}: {
  onClose: () => void;
  units: Array<{ id: string; name: string }>;
}) {
  const qc = useQueryClient();
  const claimPairingCodeFn = useServerFn(claimPairingCode);
  const { profile } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unitId, setUnitId] = useState<string>("");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");

      const res = await claimPairingCodeFn({
        data: {
          code: code.trim(),
          name,
          unit_id: unitId || null,
          orientation,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res?.ok || !res.screen_id) throw new Error("Falha ao concluir o pareamento.");
      const screenName = res?.screen_name ?? name;
      toast.success(`Tela "${screenName}" pareada com sucesso!`);
      qc.invalidateQueries({ queryKey: ["screens", profile?.organization_id] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao parear.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
              <Tv className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold">Parear nova tela</h2>
              <p className="text-[11px] text-muted-foreground">
                Informe o código exibido no player.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Código de pareamento
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2.5 font-mono text-lg tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Abra <code className="text-foreground">/pareamento</code> na TV para ver o código.
            </p>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Nome da tela
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Recepção / Vitrine principal"
              required
              minLength={2}
              className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Unidade
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sem unidade</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Orientação
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as "landscape" | "portrait")}
                className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="landscape">Paisagem</option>
                <option value="portrait">Retrato</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:bg-accent transition-smooth"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pareando…
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Parear tela
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
