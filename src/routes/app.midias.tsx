import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { Modal, FormField, TextInput, PrimaryButton } from "@/components/ui-kit/FormControls";
import { useMedia, useCreateMedia, useDeleteMedia } from "@/lib/hooks/use-supabase-data";
import {
  Plus,
  Upload,
  Filter,
  Search,
  Image as ImageIcon,
  Video,
  FileCode,
  Trash2,
  Images,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/midias")({
  head: () => ({ meta: [{ title: "Biblioteca de mídias — Signix" }] }),
  component: MediaPage,
});

function MediaPage() {
  const { data: media = [], isLoading, error } = useMedia();
  const create = useCreateMedia();
  const remove = useDeleteMedia();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    file_type: "image",
    public_url: "",
    duration_seconds: 10,
  });

  const filtered = media.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      name: form.name,
      file_type: form.file_type,
      file_path: form.public_url,
      public_url: form.public_url,
      thumbnail_url: form.public_url,
      duration_seconds: form.duration_seconds,
      tags: [],
      status: "active",
    });
    setOpen(false);
    setForm({ name: "", file_type: "image", public_url: "", duration_seconds: 10 });
  };

  const iconFor = (t: string) =>
    t.includes("video") ? Video : t.includes("html") ? FileCode : ImageIcon;

  // Converte URLs de visualização (Google Drive, Dropbox) em links diretos de imagem
  const toDirectUrl = (url?: string | null) => {
    if (!url) return "";
    // Google Drive: .../file/d/{ID}/view  ->  uc?export=view&id={ID}
    const gdrive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (gdrive) return `https://drive.google.com/uc?export=view&id=${gdrive[1]}`;
    // Google Drive open?id=
    const gdriveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (gdriveOpen) return `https://drive.google.com/uc?export=view&id=${gdriveOpen[1]}`;
    // Dropbox: ?dl=0 -> ?raw=1
    if (url.includes("dropbox.com")) return url.replace(/[?&]dl=\d/, "").concat(url.includes("?") ? "&raw=1" : "?raw=1");
    return url;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de mídias"
        subtitle="Arquivos disponíveis para uso em playlists e campanhas."
        actions={
          <PrimaryButton onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar mídia
          </PrimaryButton>
        }
      />

      <button
        onClick={() => setOpen(true)}
        className="block w-full rounded-xl border-2 border-dashed border-border bg-surface/30 p-8 text-center hover:border-primary/40 hover:bg-surface/50 transition-smooth"
      >
        <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary mb-3">
          <Upload className="h-6 w-6" />
        </div>
        <p className="font-display text-base font-semibold">Adicionar arquivo via URL</p>
        <p className="text-xs text-muted-foreground mt-1">
          Cole a URL pública da imagem, vídeo ou HTML. Upload completo via Storage chega em breve.
        </p>
      </button>

      <Panel
        title={`${media.length} arquivos`}
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mídia…"
                className="rounded-md border border-input bg-surface pl-7 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-accent">
              <Filter className="h-3.5 w-3.5" /> Filtrar
            </button>
          </>
        }
      >
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Images} title="Nenhuma mídia" description="Adicione arquivos para usar em campanhas." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filtered.map((m) => {
              const Icon = iconFor(m.file_type);
              return (
                <article
                  key={m.id}
                  className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-glow transition-smooth"
                >
                  <div className="relative aspect-video bg-surface overflow-hidden">
                    {m.thumbnail_url ? (
                      <img
                        src={toDirectUrl(m.thumbnail_url)}
                        alt={m.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <Icon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] text-white uppercase tracking-wider font-medium">
                      <Icon className="h-2.5 w-2.5" /> {m.file_type}
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <StatusBadge tone={m.status === "active" ? "success" : "neutral"} label={m.status} withDot={false} />
                    </div>
                    {m.duration_seconds && (
                      <div className="absolute bottom-1.5 left-1.5 text-[10px] text-white font-mono bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5">
                        {m.duration_seconds}s
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-xs font-medium truncate flex-1">{m.name}</p>
                      <button
                        onClick={() => confirm("Remover mídia?") && remove.mutate(m.id)}
                        className="h-5 w-5 grid place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(m.created_at), "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar mídia">
        <form onSubmit={submit} className="space-y-3">
          <FormField label="Nome">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Tipo">
            <select
              value={form.file_type}
              onChange={(e) => setForm({ ...form, file_type: e.target.value })}
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm"
            >
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
              <option value="html">HTML</option>
            </select>
          </FormField>
          <FormField label="URL pública">
            <TextInput
              type="url"
              required
              placeholder="https://…"
              value={form.public_url}
              onChange={(e) => setForm({ ...form, public_url: e.target.value })}
            />
          </FormField>
          <FormField label="Duração (segundos)">
            <TextInput
              type="number"
              min={1}
              value={form.duration_seconds}
              onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })}
            />
          </FormField>
          <PrimaryButton type="submit" disabled={create.isPending}>
            {create.isPending ? "Salvando…" : "Adicionar"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
