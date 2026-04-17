import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { EmptyPanel, ErrorPanel, LoadingPanel, PreviewModeBanner } from "@/components/ui-kit/data-states";
import {
  usePlaylistItemsQuery,
  usePlaylistMutations,
  usePlaylistsQuery,
  useProfileQuery,
  useSignageEnabled,
} from "@/hooks/use-signage";
import { formatBytes } from "@/lib/signage-queries";
import { recordStatusLabel } from "@/lib/signage-ui-helpers";
import { Plus, ListVideo, Clock, GripVertical, Eye, Play, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/app/playlists")({
  head: () => ({ meta: [{ title: "Playlists — Signix" }] }),
  component: PlaylistsPage,
});

type PlRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  playlist_items?: { count: number }[];
};

function PlaylistsPage() {
  const hasBackend = useSignageEnabled();
  const { data: profile, isLoading: lp, error: pe, refetch: rfP } = useProfileQuery();
  const orgId = profile?.organization_id;
  const { data: playlists = [], isLoading: lpl, error: ple, refetch: rfPl } = usePlaylistsQuery(orgId);
  const { create, update, remove } = usePlaylistMutations(orgId);

  const list = playlists as PlRow[];
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedId && list[0]?.id) setSelectedId(list[0].id);
  }, [list, selectedId]);

  useEffect(() => {
    if (selectedId && !list.some((p) => p.id === selectedId)) {
      setSelectedId(list[0]?.id);
    }
  }, [list, selectedId]);

  const selected = useMemo(() => list.find((p) => p.id === selectedId), [list, selectedId]);
  const { data: items = [], isLoading: li } = usePlaylistItemsQuery(selectedId);

  const itemCount = (p: PlRow) => p.playlist_items?.[0]?.count ?? 0;

  const onCreate = () => {
    const name = window.prompt("Nome da playlist?");
    if (!name?.trim()) return;
    create.mutate(name.trim(), {
      onSuccess: (row: { id: string }) => setSelectedId(row.id),
      onError: (e) => {
        console.error("[Signix] create playlist", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  const onPublish = () => {
    if (!selectedId) return;
    update.mutate(
      { id: selectedId, patch: { status: "active" } },
      {
        onError: (e) => {
          console.error("[Signix] publish playlist", e);
          window.alert(e instanceof Error ? e.message : "Erro");
        },
      },
    );
  };

  const onDeletePlaylist = (id: string) => {
    if (!window.confirm("Excluir playlist?")) return;
    remove.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(list.find((p) => p.id !== id)?.id);
      },
      onError: (e) => {
        console.error("[Signix] delete playlist", e);
        window.alert(e instanceof Error ? e.message : "Erro");
      },
    });
  };

  if (!hasBackend) {
    return (
      <div className="space-y-6">
        <PreviewModeBanner />
        <PageHeader title="Playlists" subtitle="Modo preview." />
        <EmptyPanel title="Playlists" hint="Conecte o Supabase." />
      </div>
    );
  }

  if (lp || lpl) {
    return (
      <div className="space-y-6">
        <PageHeader title="Playlists" subtitle="Carregando…" />
        <LoadingPanel />
      </div>
    );
  }

  if (pe || ple) {
    return (
      <div className="space-y-6">
        <PageHeader title="Playlists" subtitle="Erro" />
        <ErrorPanel message={(pe ?? ple)?.message ?? "Erro"} onRetry={() => { void rfP(); void rfPl(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlists"
        subtitle="Sequências de mídias prontas para serem usadas em campanhas."
        actions={
          <button
            type="button"
            onClick={onCreate}
            disabled={create.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Nova playlist
          </button>
        }
      />

      {list.length === 0 ? (
        <EmptyPanel title="Nenhuma playlist" hint="Crie uma playlist para montar campanhas." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {list.map((p, i) => (
              <div key={p.id} className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`flex-1 text-left rounded-lg border ${selectedId === p.id ? "border-primary/50 bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/30"} p-4 transition-smooth`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center">
                        <ListVideo className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {itemCount(p)} itens
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      tone={p.status === "active" ? "success" : "neutral"}
                      label={recordStatusLabel(p.status)}
                      withDot={false}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                    {p.description ?? ""}
                  </p>
                </button>
                <button
                  type="button"
                  title="Excluir"
                  onClick={() => onDeletePlaylist(p.id)}
                  className="shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <Panel
              title={selected?.name ?? "Playlist"}
              description="Itens vinculados no banco (ordem por position)."
              actions={
                <>
                  <Link
                    to="/app/preview"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-accent"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Link>
                  <button
                    type="button"
                    onClick={onPublish}
                    disabled={!selectedId || update.isPending}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2.5 py-1.5 text-xs hover:bg-primary/20 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" /> Publicar
                  </button>
                </>
              }
            >
              {li ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Carregando itens…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum item nesta playlist.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map(
                    (
                      row: {
                        id: string;
                        position: number;
                        duration_override_seconds: number | null;
                        media_assets: {
                          id: string;
                          name: string;
                          file_type: string;
                          public_url: string | null;
                          thumbnail_url: string | null;
                          duration_seconds: number | null;
                          file_size: number | null;
                        } | null;
                      },
                      i: number,
                    ) => {
                      const m = row.media_assets;
                      const src = m?.thumbnail_url || m?.public_url || "";
                      const dur = row.duration_override_seconds ?? m?.duration_seconds ?? 0;
                      return (
                        <li
                          key={row.id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-2.5 hover:border-primary/30 transition-smooth"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <div className="h-12 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                            {src ? (
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full grid place-items-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m?.name ?? "—"}</p>
                            <p className="text-[11px] text-muted-foreground capitalize flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" /> {m?.file_type ?? "—"} ·{" "}
                              {formatBytes(m?.file_size)}
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono">
                            <Clock className="h-3 w-3 text-muted-foreground" /> {dur}s
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground w-6 text-right">
                            #{i + 1}
                          </span>
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
