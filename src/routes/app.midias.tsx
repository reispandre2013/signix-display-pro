import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Panel } from "@/components/ui-kit/Panel";
import { StatusBadge } from "@/components/ui-kit/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui-kit/States";
import { Modal, FormField, TextInput, PrimaryButton } from "@/components/ui-kit/FormControls";
import { useMedia, useCreateMedia, useDeleteMedia } from "@/lib/hooks/use-supabase-data";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { applyMediaFallback, getMediaUrlCandidates } from "@/lib/media-url";
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

type MediaRow = {
  id: string;
  name: string;
  file_type: string;
  public_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size: number | null;
  status: string;
  created_at: string;
};

type DetectedMedia = {
  fileType: "image" | "video" | "html";
  mimeType: string | null;
  extension: string | null;
};

type UploadDetectedMedia = {
  fileType: "image" | "video";
  mimeType: string;
  extension: string;
  bucket: "media-images" | "media-videos";
};

const MAX_IMAGE_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 500 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function detectMediaFromUrl(urlRaw: string, fallback: "image" | "video" | "html"): DetectedMedia {
  const lower = urlRaw.trim().toLowerCase();
  const extMatch = lower.match(/\.([a-z0-9]+)(?:\?|#|$)/);
  const ext = extMatch?.[1] ?? null;

  if (ext === "mp4" || lower.includes("mime=video/mp4")) {
    return { fileType: "video", mimeType: "video/mp4", extension: "mp4" };
  }
  if (ext === "html" || ext === "htm") {
    return { fileType: "html", mimeType: "text/html", extension: ext };
  }
  if (ext && ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext)) {
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "svg"
          ? "image/svg+xml"
          : `image/${ext}`;
    return { fileType: "image", mimeType: mime, extension: ext };
  }

  // Links do Google Drive não trazem extensão no URL: usamos fallback de UI.
  if (fallback === "video") return { fileType: "video", mimeType: "video/mp4", extension: "mp4" };
  if (fallback === "html") return { fileType: "html", mimeType: "text/html", extension: "html" };
  return { fileType: "image", mimeType: null, extension: null };
}

function detectMediaFromFile(file: File): UploadDetectedMedia | null {
  const nameLower = file.name.toLowerCase();
  const extMatch = nameLower.match(/\.([a-z0-9]+)$/);
  const ext = extMatch?.[1] ?? "";
  const mime = String(file.type || "").toLowerCase();

  if (mime === "video/mp4" || ext === "mp4") {
    return {
      fileType: "video",
      mimeType: "video/mp4",
      extension: "mp4",
      bucket: "media-videos",
    };
  }

  const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"]);
  if (mime.startsWith("image/") || imageExtensions.has(ext)) {
    const normalizedExtension = ext || (mime.startsWith("image/") ? mime.replace("image/", "") : "jpg");
    const normalizedMime =
      mime && mime.startsWith("image/")
        ? mime
        : normalizedExtension === "jpg" || normalizedExtension === "jpeg"
          ? "image/jpeg"
          : normalizedExtension === "svg"
            ? "image/svg+xml"
            : `image/${normalizedExtension}`;
    return {
      fileType: "image",
      mimeType: normalizedMime,
      extension: normalizedExtension,
      bucket: "media-images",
    };
  }

  return null;
}

function MediaPage() {
  const { profile } = useAuth();
  const { data: media = [], isLoading, error } = useMedia();
  const create = useCreateMedia();
  const remove = useDeleteMedia();
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"url" | "upload">("url");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    file_type: "image",
    public_url: "",
    duration_seconds: 10,
  });

  const filtered = media.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (sourceType === "upload") {
      if (!profile?.organization_id) {
        setFormError("Não foi possível identificar a organização da sessão.");
        return;
      }
      if (!uploadFile) {
        setFormError("Selecione um arquivo para upload.");
        return;
      }

      const detectedFile = detectMediaFromFile(uploadFile);
      if (!detectedFile) {
        setFormError("Formato inválido. Envie imagem ou vídeo MP4.");
        return;
      }
      if (detectedFile.fileType === "video" && detectedFile.mimeType !== "video/mp4") {
        setFormError("No momento, apenas vídeo MP4 é suportado.");
        return;
      }
      if (detectedFile.fileType === "image" && uploadFile.size > MAX_IMAGE_UPLOAD_BYTES) {
        setFormError("Imagem acima do limite de 50MB.");
        return;
      }
      if (detectedFile.fileType === "video" && uploadFile.size > MAX_VIDEO_UPLOAD_BYTES) {
        setFormError("Vídeo acima do limite de 500MB.");
        return;
      }

      const cleaned = sanitizeFileName(form.name || uploadFile.name || "media");
      const now = Date.now();
      const objectPath = `${profile.organization_id}/${now}-${cleaned}.${detectedFile.extension}`;
      const fullStoragePath = `${detectedFile.bucket}/${objectPath}`;

      const { error: uploadError } = await supabase.storage
        .from(detectedFile.bucket)
        .upload(objectPath, uploadFile, {
          contentType: detectedFile.mimeType,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        setFormError(`Falha no upload: ${uploadError.message}`);
        return;
      }

      const { data: signedData } = await supabase.storage
        .from(detectedFile.bucket)
        .createSignedUrl(objectPath, 60 * 60 * 24 * 30);

        await create.mutateAsync({
          name: form.name,
          file_type: detectedFile.fileType,
          file_path: fullStoragePath,
          public_url: signedData?.signedUrl ?? null,
          thumbnail_url: detectedFile.fileType === "video" ? null : signedData?.signedUrl ?? null,
          duration_seconds: detectedFile.fileType === "video" ? null : form.duration_seconds,
          mime_type: detectedFile.mimeType,
          file_size: uploadFile.size,
          tags: [],
          status: "active",
        });
      } else {
        const detected = detectMediaFromUrl(
          form.public_url,
          form.file_type as "image" | "video" | "html",
        );
        if (
          detected.fileType === "video" &&
          detected.mimeType !== "video/mp4" &&
          !form.public_url.toLowerCase().includes("drive.google.com")
        ) {
          setFormError("No momento, apenas vídeo MP4 é suportado.");
          return;
        }
        await create.mutateAsync({
          name: form.name,
          file_type: detected.fileType,
          file_path: form.public_url,
          public_url: form.public_url,
          thumbnail_url: detected.fileType === "video" ? null : form.public_url,
          duration_seconds: detected.fileType === "video" ? null : form.duration_seconds,
          mime_type: detected.mimeType,
          tags: [],
          status: "active",
        });
      }

      setOpen(false);
      setForm({ name: "", file_type: "image", public_url: "", duration_seconds: 10 });
      setSourceType("url");
      setUploadFile(null);
      setFormError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao salvar mídia.";
      setFormError(message);
    }
  };

  const iconFor = (t: string) =>
    t.includes("video") ? Video : t.includes("html") ? FileCode : ImageIcon;

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
          Use URL externa (Google Drive incluído) ou upload direto no Storage.
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
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs hover:bg-accent"
            >
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
              const sources = getMediaUrlCandidates(
                { mediaTypeHint: m.file_type?.toLowerCase().includes("video") ? "video" : "image" },
                m.thumbnail_url,
                m.public_url,
              );
              return (
                <article
                  key={m.id}
                  className="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-glow transition-smooth"
                >
                  <div className="relative aspect-video bg-surface overflow-hidden">
                    {sources.length > 0 ? (
                      m.file_type?.toLowerCase().includes("video") ? (
                        <video
                          src={sources[0]}
                          className="w-full h-full object-cover bg-black"
                          muted
                          loop
                          autoPlay
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={sources[0]}
                          data-sources={JSON.stringify(sources)}
                          data-source-index="0"
                          alt={m.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => applyMediaFallback(e.currentTarget)}
                        />
                      )
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
          {formError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          ) : null}
          <FormField label="Nome">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Origem da mídia">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType("url")}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  sourceType === "url"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-surface text-foreground"
                }`}
              >
                Link externo
              </button>
              <button
                type="button"
                onClick={() => setSourceType("upload")}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  sourceType === "upload"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-surface text-foreground"
                }`}
              >
                Upload no sistema
              </button>
            </div>
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
          {sourceType === "url" ? (
            <FormField label="URL pública">
              <TextInput
                type="url"
                required
                placeholder="https://…"
                value={form.public_url}
                onChange={(e) => setForm({ ...form, public_url: e.target.value })}
              />
            </FormField>
          ) : (
            <FormField label="Arquivo">
              <input
                type="file"
                required
                accept={form.file_type === "video" ? "video/mp4" : "image/*,video/mp4"}
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary"
              />
            </FormField>
          )}
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
