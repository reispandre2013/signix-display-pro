import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  useProfileQuery,
  useScreensQuery,
  useScreenMutations,
  useSignageEnabled,
  useUnitsQuery,
} from "@/hooks/use-signage";
import { screenHealthPercent } from "@/lib/signage-ui-helpers";
import { Plus, Search, Filter, MoreHorizontal, MonitorSmartphone, MapPin, Cpu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/telas")({
  head: () => ({ meta: [{ title: "Telas e Players — Signix" }] }),
  component: ScreensPage,
});

type ScreenRow = {
  id: string;
  name: string;
  pairing_code: string | null;
  resolution: string | null;
  orientation: string;
  platform: string | null;
  player_version: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  device_status: string;
  units: { name: string } | null;
  campaigns: { name: string } | null;
};

function ScreensPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: loadingProfile, error: profileError, refetch: refetchProfile } =
    useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: screens = [], isLoading: loadingScreens, error: screensError, refetch: refetchScreens } =
    useScreensQuery(orgId);
  const { data: units = [] } = useUnitsQuery(orgId);
  const { create, remove } = useScreenMutations(orgId);

  const list = screens as ScreenRow[];

  const stats = useMemo(() => {
    const total = list.length;
    const online = list.filter((s) => s.is_online).length;
    const offline = list.filter((s) => !s.is_online).length;
    const warning = list.filter((s) => s.device_status === "warning").length;
    return { total, online, offline, warning };
  }, [list]);

  const onAddScreen = () => {
    const name = window.prompt("Nome da nova tela?");
    if (!name?.trim()) return;
    let unitId: string | null | undefined;
    if (units.length) {
      const pick = window.prompt(
        `ID da unidade (opcional). Unidades: ${units
          .map((u: { id: string; name: string }) => `${u.name}=${u.id}`)
          .join(" | ")}`,
      );
      unitId = pick?.trim() || null;
    }
    create.mutate(
      { name: name.trim(), unit_id: unitId },
      {
        onError: (e) => {
          console.error("[Signix] Erro ao criar tela", e);
          window.alert(e instanceof Error ? e.message : "Falha ao criar tela");
        },
      },
    );
  };

  const onRemoveScreen = (id: string) => {
    if (!window.confirm("Excluir esta tela?")) return;
    remove.mutate(id, {
      onError: (e) => {
        console.error("[Signix] Erro ao excluir tela", e);
        window.alert(e instanceof Error ? e.message : "Falha ao excluir");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader
          title="Telas / Players"
          subtitle="Gerencie todos os dispositivos físicos conectados ao Signix."
          actions={
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent transition-smooth"
              >
                <Filter className="h-3.5 w-3.5" /> Filtros
              </button>
              <Link
                to="/pareamento"
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar tela
              </Link>
            </>
          }
        />
        <EmptyPanel title="Modo preview" hint="Configure as variáveis do Supabase para listar telas reais." />
      </div>
    );
  }

  if (loadingProfile || loadingScreens) {
    return (
      <div className="space-y-6">
        <PageHeader title="Telas / Players" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (profileError || screensError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Telas / Players" subtitle="Erro ao carregar dados." />
        <ErrorPanel
          message={(profileError ?? screensError)?.message ?? "Erro desconhecido"}
          onRetry={() => {
            void refetchProfile();
            void refetchScreens();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telas / Players"
        subtitle="Gerencie todos os dispositivos físicos conectados ao Signix."
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent transition-smooth"
            >
              <Filter className="h-3.5 w-3.5" /> Filtros
            </button>
            <button
              type="button"
              onClick={onAddScreen}
              disabled={create.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar tela
            </button>
            <Link
              to="/pareamento"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Pareamento
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Total", v: stats.total },
          { l: "Online", v: stats.online },
          { l: "Offline", v: stats.offline },
          { l: "Atenção", v: stats.warning },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      <Panel
        title={`${list.length} dispositivos`}
        description="Lista completa com filtros e busca."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar por nome, código…"
                className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        {list.length === 0 ? (
          <div className="p-6">
            <EmptyPanel title="Nenhuma tela" hint="Crie uma tela ou use o fluxo de pareamento." />
          </div>
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
                  <Th>Campanha atual</Th>
                  <Th>Último ping</Th>
                  <Th>Saúde</Th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const health = screenHealthPercent(s);
                  const lastPing = s.last_seen_at ?? new Date().toISOString();
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-surface/40 transition-colors"
                    >
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
                          {s.units?.name ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={s.device_status} />
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Cpu className="h-3 w-3 text-muted-foreground" />
                          {s.platform ?? "—"}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-mono">{s.player_version ?? ""}</p>
                      </Td>
                      <Td>
                        <span className="text-xs font-mono">{s.resolution ?? "—"}</span>
                        <p className="text-[10px] text-muted-foreground">{s.orientation}</p>
                      </Td>
                      <Td>
                        <span className="text-xs">{s.campaigns?.name ?? "—"}</span>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lastPing), { locale: ptBR, addSuffix: true })}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2 w-24">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full ${health > 80 ? "bg-success" : health > 50 ? "bg-warning" : "bg-destructive"}`}
                              style={{ width: `${health}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground w-7 text-right">
                            {health}%
                          </span>
                        </div>
                      </Td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          title="Excluir"
                          onClick={() => onRemoveScreen(s.id)}
                          disabled={remove.isPending}
                          className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>
            Mostrando {list.length} de {list.length} dispositivos
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1 hover:bg-accent"
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1 bg-primary/10 text-primary"
            >
              1
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2.5 py-1 hover:bg-accent"
            >
              Próxima
            </button>
          </div>
        </div>
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
