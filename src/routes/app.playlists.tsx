import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { Modal, FormField, TextInput, TextArea, PrimaryButton } from "@/components/ui-kit/FormControls";
import {
  usePlaylists,
  useCreatePlaylist,
  useDeletePlaylist,
  usePlaylistItems,
  useAddPlaylistItem,
  useDeletePlaylistItem,
  useSwapPlaylistItemPositions,
  useMedia,
} from "@/lib/hooks/use-supabase-data";
import type { Playlist } from "@/lib/db-types";
import { Plus, ListVideo, Eye, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/app/playlists")({
  head: () => ({ meta: [{ title: "Playlists — Signix" }] }),
  component: PlaylistsPage,
});

type PlaylistRow = Playlist & { playlist_items?: { count: number }[] };

function itemCount(p: PlaylistRow): number {
  const agg = p.playlist_items?.[0]?.count;
  return typeof agg === "number" ? agg : 0;
}

function PlaylistsPage() {
  const { data: playlists = [], isLoading, error } = usePlaylists();
  const create = useCreatePlaylist();
  const remove = useDeletePlaylist();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [mediaToAdd, setMediaToAdd] = useState("");

  const current = useMemo(
    () => playlists.find((p) => p.id === (selected ?? playlists[0]?.id)) as PlaylistRow | undefined,
    [playlists, selected],
  );

  const { data: items = [], isLoading: itemsLoading } = usePlaylistItems(current?.id ?? null);
  const { data: media = [] } = useMedia();
  const addItem = useAddPlaylistItem();
  const deleteItem = useDeletePlaylistItem();
  const swapPositions = useSwapPlaylistItemPositions();

  useEffect(() => {
    if (!selected && playlists[0]?.id) setSelected(playlists[0].id);
  }, [playlists, selected]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ name: form.name, description: form.description, status: "draft" });
    setOpen(false);
    setForm({ name: "", description: "" });
  };

  const usedMediaIds = useMemo(() => new Set(items.map((i) => i.media_asset_id)), [items]);
  const mediaOptions = useMemo(
    () => media.filter((m) => m.status === "active" && !usedMediaIds.has(m.id)),
    [media, usedMediaIds],
  );

  const handleAddItem = async () => {
    if (!current?.id || !mediaToAdd) return;
    await addItem.mutateAsync({ playlistId: current.id, mediaAssetId: mediaToAdd });
    setMediaToAdd("");
  };

  const handleMove = async (index: number, dir: -1 | 1) => {
    if (!current?.id) return;
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const a = items[index];
    const b = items[next];
    await swapPositions.mutateAsync({
      playlistId: current.id,
      itemIdA: a.id,
      itemIdB: b.id,
      posA: a.position,
      posB: b.position,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlists"
        subtitle="Sequências de mídias usadas em campanhas (tabela playlist_items + media_assets)."
        actions={
          <PrimaryButton onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova playlist
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : playlists.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ListVideo}
            title="Nenhuma playlist criada"
            description="Crie playlists e adicione mídias da biblioteca para as campanhas reproduzirem na ordem correta."
            action={
              <PrimaryButton onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Nova playlist
              </PrimaryButton>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {playlists.map((p) => {
              const row = p as PlaylistRow;
              const active = current?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left rounded-lg border ${
                    active ? "border-primary/50 bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/30"
                  } p-4 transition-smooth`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center">
                        <ListVideo className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {itemCount(row)} itens · {p.status}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      tone={p.status === "active" ? "success" : "neutral"}
                      label={p.status}
                      withDot={false}
                    />
                  </div>
                  {p.description && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {current && (
              <Panel
                title={current.name}
                description={current.description ?? "Sem descrição"}
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
                      onClick={() => confirm("Excluir playlist?") && remove.mutate(current.id)}
                      className="inline-flex items-center gap-1 rounded-md text-destructive hover:bg-destructive/10 px-2.5 py-1.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </>
                }
              >
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Adicionar mídia à sequência</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={mediaToAdd}
                        onChange={(e) => setMediaToAdd(e.target.value)}
                        className="flex-1 rounded-md border border-input bg-surface px-2 py-1.5 text-xs"
                      >
                        <option value="">Escolha uma mídia da biblioteca…</option>
                        {mediaOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.file_type})
                          </option>
                        ))}
                      </select>
                      <PrimaryButton
                        type="button"
                        disabled={!mediaToAdd || addItem.isPending}
                        onClick={() => void handleAddItem()}
                      >
                        {addItem.isPending ? "A adicionar…" : "Adicionar"}
                      </PrimaryButton>
                    </div>
                    {mediaOptions.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Todas as mídias ativas já estão nesta playlist ou a biblioteca está vazia.
                      </p>
                    )}
                  </div>

                  {itemsLoading ? (
                    <LoadingState />
                  ) : items.length === 0 ? (
                    <EmptyState
                      icon={ListVideo}
                      title="Playlist sem itens"
                      description="Adicione mídias acima. A ordem define a reprodução na campanha (campo position em playlist_items)."
                    />
                  ) : (
                    <ul className="space-y-2">
                      {items.map((row, index) => {
                        const m = row.media_assets;
                        return (
                          <li
                            key={row.id}
                            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
                          >
                            <span className="font-mono text-muted-foreground w-6 shrink-0">{row.position}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{m?.name ?? "Mídia removida?"}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {m?.file_type ?? "—"}
                                {row.duration_override_seconds != null
                                  ? ` · override ${row.duration_override_seconds}s`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                title="Subir"
                                disabled={index === 0 || swapPositions.isPending}
                                onClick={() => void handleMove(index, -1)}
                                className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-accent disabled:opacity-40"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Descer"
                                disabled={index === items.length - 1 || swapPositions.isPending}
                                onClick={() => void handleMove(index, 1)}
                                className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-accent disabled:opacity-40"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Remover da playlist"
                                disabled={deleteItem.isPending}
                                onClick={() => {
                                  if (!confirm("Remover este item da playlist?")) return;
                                  void deleteItem.mutateAsync({ id: row.id, playlistId: current.id });
                                }}
                                className="h-7 w-7 grid place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova playlist">
        <form onSubmit={submit} className="space-y-3">
          <FormField label="Nome">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Descrição">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <PrimaryButton type="submit" disabled={create.isPending}>
            {create.isPending ? "Salvando…" : "Criar"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
