import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient } from "../_shared/client.ts";
import { readJson } from "../_shared/http.ts";

type ResolvePayload = {
  screenId?: string | null;
  screen_id?: string | null;
  pairingCode?: string | null;
  pairing_code?: string | null;
  code?: string | null;
};

const corsJsonHeaders: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsJsonHeaders });
}

function normalizeScreenId(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

function normalizeCode(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

type ResolveResult = {
  success: boolean;
  playlist: unknown[];
  screen: unknown | null;
  message: string;
  payload: unknown;
};

type ScreenRow = {
  id: string;
  name: string;
  organization_id: string;
  unit_id: string | null;
  platform: string | null;
  store_type: string | null;
};

type CampaignRow = {
  id: string;
  name: string;
  playlist_id: string;
  priority: number;
  start_at: string;
  end_at: string;
  status: string;
  updated_at: string;
};

type PlaylistRow = { id: string; name: string; updated_at: string | null };
type PlaylistLinkRow = {
  id: string;
  media_asset_id: string;
  position: number;
  duration_override_seconds: number | null;
  transition_type: string | null;
};
type MediaRow = {
  id: string;
  name: string;
  file_type: string;
  category: string | null;
  tags: string[] | null;
  public_url: string | null;
  file_path: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  mime_type: string | null;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  updated_at: string | null;
};

function detectMediaType(media: MediaRow): "video" | "html" | "banner" | "image" {
  const fileType = String(media.file_type || "").toLowerCase();
  const mimeType = String(media.mime_type || "").toLowerCase();
  if (fileType.includes("video") || mimeType.startsWith("video/")) return "video";
  if (fileType.includes("html") || mimeType.startsWith("text/html")) return "html";
  if (fileType.includes("banner")) return "banner";
  return "image";
}

function mapMediaToPayloadItem(link: PlaylistLinkRow, media: MediaRow) {
  return {
    id: String(link.id || media.id),
    media_asset_id: String(media.id),
    media_type: detectMediaType(media),
    media_url: media.public_url ?? media.file_path ?? "",
    thumbnail_url: media.thumbnail_url ?? null,
    duration_seconds: link.duration_override_seconds ?? media.duration_seconds ?? 8,
    position: Number(link.position ?? 0),
    transition_type: link.transition_type ?? "fade",
    checksum: `${media.id}:${media.updated_at ?? ""}`,
    metadata: {
      media_name: media.name ?? "",
      category: media.category ?? null,
      tags: media.tags ?? [],
    },
  };
}

async function resolveScreenIdFromInput(body: ResolvePayload): Promise<string> {
  const byId = normalizeScreenId(body.screenId ?? body.screen_id ?? null);
  if (byId) return byId;

  const code = normalizeCode(body.pairingCode ?? body.pairing_code ?? body.code ?? null);
  if (!code) return "";

  const { data: pairing, error } = await adminClient
    .from("pairing_codes")
    .select("screen_id, used_at")
    .eq("code", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!pairing?.screen_id || !pairing?.used_at) return "";
  return String(pairing.screen_id);
}

async function loadScreen(screenId: string): Promise<ScreenRow | null> {
  if (!screenId) return null;
  const { data: screen, error } = await adminClient
    .from("screens")
    .select("id, name, organization_id, unit_id, platform, store_type")
    .eq("id", screenId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!screen) return null;
  return {
    id: screen.id as string,
    name: (screen.name as string) ?? "",
    organization_id: screen.organization_id as string,
    unit_id: (screen.unit_id as string) ?? null,
    platform: (screen.platform as string) ?? null,
    store_type: (screen.store_type as string) ?? null,
  };
}

async function loadPayloadFromCampaignFallback(screen: ScreenRow): Promise<unknown | null> {
  const nowIso = new Date().toISOString();
  const targetFilters = [`and(target_type.eq.screen,target_id.eq.${screen.id})`];
  if (screen.unit_id) targetFilters.push(`and(target_type.eq.unit,target_id.eq.${screen.unit_id})`);

  const { data: targets, error: targetError } = await adminClient
    .from("campaign_targets")
    .select("campaign_id")
    .or(targetFilters.join(","));
  if (targetError) throw new Error(targetError.message);

  const campaignIds = [...new Set((targets ?? []).map((t) => String(t.campaign_id)))];
  if (campaignIds.length === 0) return null;

  const { data: campaigns, error: campaignError } = await adminClient
    .from("campaigns")
    .select("id, name, playlist_id, priority, start_at, end_at, status, updated_at")
    .eq("organization_id", screen.organization_id)
    .eq("status", "active")
    .lte("start_at", nowIso)
    .gte("end_at", nowIso)
    .in("id", campaignIds)
    .order("priority", { ascending: false })
    .order("start_at", { ascending: false })
    .limit(1);
  if (campaignError) throw new Error(campaignError.message);
  const campaign = ((campaigns ?? [])[0] ?? null) as CampaignRow | null;
  if (!campaign) return null;

  const { data: playlist, error: playlistError } = await adminClient
    .from("playlists")
    .select("id, name, updated_at")
    .eq("id", campaign.playlist_id)
    .maybeSingle();
  if (playlistError) throw new Error(playlistError.message);
  const playlistRow = (playlist ?? null) as PlaylistRow | null;
  if (!playlistRow) return null;

  const { data: links, error: linksError } = await adminClient
    .from("playlist_items")
    .select("id, media_asset_id, position, duration_override_seconds, transition_type")
    .eq("playlist_id", playlistRow.id)
    .order("position", { ascending: true });
  if (linksError) throw new Error(linksError.message);
  const linkRows = (links ?? []) as PlaylistLinkRow[];
  if (linkRows.length === 0) return null;

  const mediaIds = [...new Set(linkRows.map((l) => l.media_asset_id))];
  const { data: medias, error: mediaError } = await adminClient
    .from("media_assets")
    .select(
      "id, name, file_type, category, tags, public_url, file_path, thumbnail_url, duration_seconds, mime_type, status, valid_from, valid_until, updated_at",
    )
    .in("id", mediaIds)
    .eq("organization_id", screen.organization_id);
  if (mediaError) throw new Error(mediaError.message);
  const mediaRows = (medias ?? []) as MediaRow[];

  const nowTs = Date.now();
  const mediaById = new Map<string, MediaRow>();
  for (const media of mediaRows) {
    if (media.status !== "active" && media.status !== "draft") continue;
    if (media.valid_from && new Date(media.valid_from).getTime() > nowTs) continue;
    if (media.valid_until && new Date(media.valid_until).getTime() < nowTs) continue;
    mediaById.set(media.id, media);
  }

  const items = linkRows
    .map((link) => {
      const media = mediaById.get(link.media_asset_id);
      if (!media) return null;
      return mapMediaToPayloadItem(link, media);
    })
    .filter((v) => v != null);

  if (items.length === 0) return null;

  return {
    screen_id: screen.id,
    organization_id: screen.organization_id,
    campaign_id: campaign.id,
    playlist_id: playlistRow.id,
    payload_version: `${campaign.id}:${playlistRow.updated_at ?? campaign.updated_at ?? ""}`,
    valid_until: campaign.end_at,
    priority: campaign.priority,
    items,
  };
}

async function resolvePlaylistByScreenId(screenId: string): Promise<ResolveResult> {
  // Estrutura pronta para evolução: manter este ponto central para a futura lógica
  // de busca/normalização de playlist por screen_id.
  if (!screenId) {
    return {
      success: true,
      playlist: [],
      screen: null,
      message: "Tela ainda não vinculada ao código de pareamento.",
      // Compatibilidade com o frontend atual (player espera `payload`).
      payload: null,
    };
  }

  const screen = await loadScreen(screenId);
  if (!screen) {
    return {
      success: true,
      playlist: [],
      screen: null,
      message: "Tela não encontrada.",
      payload: null,
    };
  }

  const { data: rpcPayload, error } = await adminClient.rpc("resolve_screen_payload", {
    p_screen_id: screenId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = rpcPayload ?? (await loadPayloadFromCampaignFallback(screen));
  const playlist = Array.isArray((payload as { items?: unknown[] } | null)?.items)
    ? (((payload as { items?: unknown[] }).items ?? []) as unknown[])
    : [];

  return {
    success: true,
    playlist,
    screen: {
      id: screen.id,
      name: screen.name,
      organization_id: screen.organization_id,
      platform: screen.platform,
      store_type: screen.store_type,
    },
    message: playlist.length > 0 ? "Playlist carregada" : "Nenhum item ativo encontrado para esta tela.",
    // Mantém contrato existente usado pelo player atual.
    payload: payload ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await readJson<ResolvePayload>(req).catch(() => ({} as ResolvePayload));
    const screenId = await resolveScreenIdFromInput(body);
    const result = await resolvePlaylistByScreenId(screenId);
    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 400);
  }
});
