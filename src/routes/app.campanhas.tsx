import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { Modal, FormField, TextInput, TextArea, PrimaryButton } from "@/components/ui-kit/FormControls";
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
  usePlaylists,
} from "@/lib/hooks/use-supabase-data";
import {
  Plus,
  Megaphone,
  Calendar,
  Layers,
  Pause,
  Play,
  Eye,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CampaignStatus } from "@/lib/db-types";

export const Route = createFileRoute("/app/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — Signix" }] }),
  component: CampaignsPage,
});

const statusTone: Record<CampaignStatus, "success" | "warning" | "neutral" | "primary"> = {
  active: "success",
  scheduled: "primary",
  paused: "warning",
  ended: "neutral",
  draft: "neutral",
};

const statusLabel: Record<CampaignStatus, string> = {
  active: "Ativa",
  scheduled: "Agendada",
  paused: "Pausada",
  ended: "Encerrada",
  draft: "Rascunho",
};

function CampaignsPage() {
  const { data: campaigns = [], isLoading, error } = useCampaigns();
  const { data: playlists = [] } = usePlaylists();
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const remove = useDeleteCampaign();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    playlist_id: "",
    priority: 5,
    start_at: new Date().toISOString().slice(0, 16),
    end_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.playlist_id) return;
    await create.mutateAsync({
      name: form.name,
      description: form.description,
      playlist_id: form.playlist_id,
      priority: form.priority,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
      status: "scheduled",
    });
    setOpen(false);
    setForm({ ...form, name: "", description: "" });
  };

  const togglePause = (id: string, status: CampaignStatus) => {
    update.mutate({ id, status: status === "paused" ? "active" : "paused" } as never);
  };

  const playlistName = (id: string) => playlists.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        subtitle="Crie, programe e veicule playlists em grupos de telas e unidades."
        actions={
          <PrimaryButton onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova campanha
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : campaigns.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Megaphone}
            title="Nenhuma campanha criada"
            description="Crie sua primeira campanha vinculando uma playlist a telas e horários."
            action={
              <PrimaryButton onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Nova campanha
              </PrimaryButton>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <article
              key={c.id}
              className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:border-primary/40 hover:shadow-glow transition-smooth"
            >
              <div className="relative h-32 bg-gradient-primary overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <StatusBadge tone={statusTone[c.status]} label={statusLabel[c.status].toUpperCase()} />
                  <StatusBadge tone="primary" label={`PRIO ${c.priority}`} withDot={false} />
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display text-lg font-bold leading-tight">{c.name}</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description ?? "—"}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Stat icon={Layers} label="Playlist" value={playlistName(c.playlist_id)} />
                  <Stat icon={Megaphone} label="Status" value={statusLabel[c.status]} />
                  <Stat icon={Calendar} label="Início" value={format(new Date(c.start_at), "dd/MM/yyyy", { locale: ptBR })} />
                  <Stat icon={Calendar} label="Fim" value={format(new Date(c.end_at), "dd/MM/yyyy", { locale: ptBR })} />
                </div>
                <div className="flex items-center gap-1.5 pt-3 border-t border-border">
                  <Link to="/app/preview" className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent transition-smooth">
                    <Eye className="h-3 w-3" /> Preview
                  </Link>
                  <button
                    onClick={() => togglePause(c.id, c.status)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1.5 text-xs hover:bg-primary/20 transition-smooth"
                  >
                    {c.status === "paused" ? (
                      <>
                        <Play className="h-3 w-3" /> Retomar
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3" /> Pausar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => confirm("Excluir esta campanha?") && remove.mutate(c.id)}
                    className="h-7 w-7 grid place-items-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova campanha">
        <form onSubmit={submit} className="space-y-3">
          <FormField label="Nome">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Descrição">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label="Playlist">
            <select
              required
              value={form.playlist_id}
              onChange={(e) => setForm({ ...form, playlist_id: e.target.value })}
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Início">
              <TextInput type="datetime-local" required value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </FormField>
            <FormField label="Fim">
              <TextInput type="datetime-local" required value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Prioridade (1-10)">
            <TextInput
              type="number"
              min={1}
              max={10}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            />
          </FormField>
          <PrimaryButton type="submit" disabled={create.isPending}>
            {create.isPending ? "Salvando…" : "Criar campanha"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface/50 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-foreground font-medium truncate mt-0.5">{value}</div>
    </div>
  );
}
