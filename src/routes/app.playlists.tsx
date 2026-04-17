import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { Modal, FormField, TextInput, TextArea, PrimaryButton } from "@/components/ui-kit/FormControls";
import { usePlaylists, useCreatePlaylist, useDeletePlaylist } from "@/lib/hooks/use-supabase-data";
import { Plus, ListVideo, Eye, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/playlists")({
  head: () => ({ meta: [{ title: "Playlists — Signix" }] }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const { data: playlists = [], isLoading, error } = usePlaylists();
  const create = useCreatePlaylist();
  const remove = useDeletePlaylist();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const current = playlists.find((p) => p.id === (selected ?? playlists[0]?.id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ name: form.name, description: form.description, status: "draft" });
    setOpen(false);
    setForm({ name: "", description: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlists"
        subtitle="Sequências de mídias prontas para serem usadas em campanhas."
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
            description="Crie playlists para reutilizar em várias campanhas."
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
              const active = current?.id === p.id;
              return (
                <button
                  key={p.id}
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
                        <p className="text-[11px] text-muted-foreground">{p.status}</p>
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
                      onClick={() => confirm("Excluir playlist?") && remove.mutate(current.id)}
                      className="inline-flex items-center gap-1 rounded-md text-destructive hover:bg-destructive/10 px-2.5 py-1.5 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </>
                }
              >
                <EmptyState
                  icon={ListVideo}
                  title="Itens da playlist"
                  description="Em breve: arraste mídias da biblioteca para montar a sequência desta playlist."
                />
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
