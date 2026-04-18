import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { useScreens, useUnits, useDeleteScreen, useUpdateScreen } from "@/lib/hooks/use-supabase-data";
import type { Screen } from "@/lib/db-types";
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
  Eye,
  Pencil,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { claimPairingCode } from "@/lib/server/screens.functions";
import type { PlayerPlatform } from "@/lib/platform-capabilities";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/telas")({
  head: () => ({ meta: [{ title: "Dispositivos — Signix" }] }),
  component: ScreensPage,
});

/** UI do painel ↔ valores `screen_orientation` no Postgres. */
function dbToUiOrientation(o: string): "landscape" | "portrait" {
  return o === "vertical" ? "portrait" : "landscape";
}

function uiToDbOrientation(o: "landscape" | "portrait"): "horizontal" | "vertical" {
  return o === "portrait" ? "vertical" : "horizontal";
}

function platformDisplayLabel(platform: string | null | undefined): string {
  const p = (platform ?? "android").toLowerCase();
  if (p === "tizen") return "Samsung Tizen TV";
  if (p === "web") return "Web / browser";
  return "Android TV";
}

function platformBadgeClass(platform: string | null | undefined): string {
  const p = (platform ?? "android").toLowerCase();
  if (p === "tizen") return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
  if (p === "web") return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
}

function ScreensPage() {
  const screensQ = useScreens();
  const unitsQ = useUnits();
  const del = useDeleteScreen();
  const [q, setQ] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "android" | "tizen">("all");
  const [pairOpen, setPairOpen] = useState(false);
  const [detailScreen, setDetailScreen] = useState<Screen | null>(null);
  const [editScreen, setEditScreen] = useState<Screen | null>(null);

  const screens = screensQ.data ?? [];
  const units = unitsQ.data ?? [];
  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name ?? "—";

  const filtered = useMemo(
    () =>
      screens.filter((s) => {
        const plat = (s.platform ?? "android").toLowerCase();
        if (platformFilter === "android" && plat !== "android") return false;
        if (platformFilter === "tizen" && plat !== "tizen") return false;
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          Boolean(s.pairing_code?.toLowerCase().includes(q.toLowerCase()))
        );
      }),
    [screens, q, platformFilter],
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
        title="Dispositivos"
        subtitle="Cadastre dispositivos (Android TV ou Samsung Tizen) com código de pareamento. A plataforma deve ser a mesma configurada no player."
        actions={
          <button
            type="button"
            onClick={() => setPairOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" /> Novo dispositivo
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
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as "all" | "android" | "tizen")}
              className="rounded-md border border-input bg-surface px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filtrar por plataforma"
            >
              <option value="all">Todas as plataformas</option>
              <option value="android">Android TV</option>
              <option value="tizen">Tizen TV</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, código…"
                className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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
                  type="button"
                  onClick={() => setPairOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
                >
                  <Plus className="h-3.5 w-3.5" /> Novo dispositivo
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
                  <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
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
                      <span className="inline-flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit max-w-[11rem] items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${platformBadgeClass(s.platform)}`}
                        >
                          {platformDisplayLabel(s.platform)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Cpu className="h-3 w-3" />
                          {s.store_type ?? "—"}
                        </span>
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
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          title="Detalhes do dispositivo"
                          onClick={() => setDetailScreen(s)}
                          className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Editar dispositivo"
                          onClick={() => setEditScreen(s)}
                          className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Excluir dispositivo"
                          onClick={() => handleDelete(s.id, s.name)}
                          className="h-8 w-8 grid place-items-center rounded-md hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {pairOpen && <PairScreenModal onClose={() => setPairOpen(false)} units={units} />}
      {detailScreen && (
        <ScreenDetailModal
          screen={detailScreen}
          unitLabel={unitName(detailScreen.unit_id)}
          onClose={() => setDetailScreen(null)}
        />
      )}
      {editScreen && (
        <EditScreenModal
          screen={editScreen}
          units={units}
          onClose={() => setEditScreen(null)}
          onSaved={() => setEditScreen(null)}
        />
      )}
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
  const [platform, setPlatform] = useState<PlayerPlatform>("android");
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
          platform,
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
        className="flex max-h-[min(90vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
              <Tv className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold">Novo dispositivo</h2>
              <p className="text-[11px] text-muted-foreground">
                Cadastro com código de ativação exibido na TV.
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

        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Nome do dispositivo <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Recepção / Vitrine principal"
              required
              minLength={2}
              autoFocus
              className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Código de ativação <span className="text-destructive">*</span>
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              required
              className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2.5 font-mono text-lg tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Abra <code className="text-foreground">/pareamento</code> na TV (com a mesma plataforma escolhida abaixo, ex.{" "}
              <code className="text-foreground">?platform=tizen</code>).
            </p>
          </div>

          <fieldset className="space-y-0">
            <legend className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Plataforma do dispositivo <span className="text-destructive">*</span>
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Plataforma do dispositivo">
              {(["android", "tizen"] as const).map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    platform === value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-input hover:bg-accent/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="device-platform"
                    value={value}
                    checked={platform === value}
                    onChange={() => setPlatform(value)}
                    className="h-4 w-4 shrink-0 border-input text-primary focus:ring-ring"
                  />
                  <span className="font-medium leading-tight">
                    {value === "android" ? "Android TV" : "Samsung Tizen TV"}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Obrigatório: deve coincidir com o tipo de player em pareamento.
            </p>
          </fieldset>

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
                  <Plus className="h-3.5 w-3.5" /> Salvar dispositivo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScreenDetailModal({
  screen,
  unitLabel,
  onClose,
}: {
  screen: Screen;
  unitLabel: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-bold">Detalhe do dispositivo</h2>
            <p className="text-[11px] text-muted-foreground">{screen.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Plataforma cadastrada
            </p>
            <span
              className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${platformBadgeClass(screen.platform)}`}
            >
              {platformDisplayLabel(screen.platform)}
            </span>
            {screen.store_type ? (
              <p className="mt-1 text-[11px] text-muted-foreground">Canal: {screen.store_type}</p>
            ) : null}
          </div>
          <div className="grid gap-3 rounded-lg border border-border bg-surface/40 p-3 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Código de pareamento</span>
              <span className="font-mono text-right">{screen.pairing_code ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Unidade</span>
              <span className="text-right">{unitLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Orientação</span>
              <span className="text-right">{screen.orientation}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Resolução</span>
              <span className="text-right font-mono">{screen.resolution ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Estado</span>
              <span className="text-right">{screen.device_status}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Online</span>
              <span className="text-right">{screen.is_online ? "Sim" : "Não"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Último ping</span>
              <span className="text-right text-[11px]">
                {screen.last_seen_at
                  ? formatDistanceToNow(new Date(screen.last_seen_at), { locale: ptBR, addSuffix: true })
                  : "nunca"}
              </span>
            </div>
          </div>
        </div>
        <div className="border-t border-border px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Edição de metadados do dispositivo. A plataforma não é editável aqui: mudar depois do pareamento
 * quebraria a correspondência com o binário/URL do player (risco operacional).
 */
function EditScreenModal({
  screen,
  units,
  onClose,
  onSaved,
}: {
  screen: Screen;
  units: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const update = useUpdateScreen();
  const [name, setName] = useState(screen.name);
  const [unitId, setUnitId] = useState<string>(screen.unit_id ?? "");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(dbToUiOrientation(screen.orientation));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(screen.name);
    setUnitId(screen.unit_id ?? "");
    setOrientation(dbToUiOrientation(screen.orientation));
  }, [screen]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await update.mutateAsync({
        id: screen.id,
        name: name.trim(),
        unit_id: unitId || null,
        orientation: uiToDbOrientation(orientation),
      });
      toast.success("Dispositivo atualizado.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-bold">Editar dispositivo</h2>
            <p className="text-[11px] text-muted-foreground">{screen.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
            <strong className="text-foreground">Plataforma:</strong>{" "}
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${platformBadgeClass(screen.platform)}`}>
              {platformDisplayLabel(screen.platform)}
            </span>
            . Não pode ser alterada após o cadastro (o player já está vinculado a Android ou Tizen). Para trocar de
            plataforma, exclua o dispositivo e cadastre novamente com o código gerado no player correcto.
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Nome do dispositivo <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…
                </>
              ) : (
                "Guardar alterações"
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
