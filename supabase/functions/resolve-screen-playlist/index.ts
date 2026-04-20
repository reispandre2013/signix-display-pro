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

async function resolveLegacyScreenIdByPairingCode(code: string): Promise<string> {
  if (!code) return "";
  const { data: screen, error } = await adminClient
    .from("screens")
    .select("id")
    .eq("pairing_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return screen?.id ? String(screen.id) : "";
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
  created_at?: string | null;
};

const storageMediaBuckets = new Set(["media-images", "media-videos", "thumbnails"]);

function detectMediaType(media: MediaRow): "video" | "html" | "banner" | "image" {
  const fileType = String(media.file_type || "").toLowerCase();
  const mimeType = String(media.mime_type || "").toLowerCase();
  if (fileType.includes("video") || mimeType.startsWith("video/")) return "video";
  if (fileType.includes("html") || mimeType.startsWith("text/html")) return "html";
  if (fileType.includes("banner")) return "banner";
  return "image";
}

function parseStorageObjectPath(rawPath: string | null | undefined): { bucket: string; objectPath: string } | null {
  const path = String(rawPath ?? "").trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return null;
  const slash = path.indexOf("/");
  if (slash <= 0) return null;
  const bucket = path.slice(0, slash);
  const objectPath = path.slice(slash + 1);
  if (!storageMediaBuckets.has(bucket) || !objectPath) return null;
  return { bucket, objectPath };
}

async function resolvePlayableMediaUrl(media: MediaRow): Promise<string> {
  const objectRef = parseStorageObjectPath(media.file_path);
  if (objectRef) {
    const { data, error } = await adminClient.storage
      .from(objectRef.bucket)
      .createSignedUrl(objectRef.objectPath, 60 * 60);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return media.public_url ?? media.file_path ?? "";
}

function mapMediaToPayloadItem(link: PlaylistLinkRow, media: MediaRow, mediaUrl?: string) {
  return {
    id: String(link.id || media.id),
    media_asset_id: String(media.id),
    media_type: detectMediaType(media),
    media_url: mediaUrl ?? media.public_url ?? media.file_path ?? "",
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

function extractItems(payload: unknown): unknown[] {
  return Array.isArray((payload as { items?: unknown[] } | null)?.items)
    ? (((payload as { items?: unknown[] }).items ?? []) as unknown[])
    : [];
}

async function loadOrgMediaFallbackPayload(screen: ScreenRow): Promise<unknown | null> {
  const { data: medias, error } = await adminClient
    .from("media_assets")
    .select(
      "id, name, file_type, category, tags, public_url, file_path, thumbnail_url, duration_seconds, mime_type, status, valid_from, valid_until, updated_at, created_at",
    )
    .eq("organization_id", screen.organization_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);

  const mediaRows = (medias ?? []) as MediaRow[];
  if (mediaRows.length === 0) return null;

  const nowTs = Date.now();
  const validMedias = mediaRows
    .filter((media) => {
      if (media.valid_from && new Date(media.valid_from).getTime() > nowTs) return false;
      if (media.valid_until && new Date(media.valid_until).getTime() < nowTs) return false;
      return true;
    });
  const urlPairs = await Promise.all(
    validMedias.map(async (media) => ({
      mediaId: media.id,
      url: await resolvePlayableMediaUrl(media),
    })),
  );
  const urlByMediaId = new Map<string, string>(urlPairs.map((p) => [p.mediaId, p.url]));

  const items = validMedias.map((media, idx) =>
    mapMediaToPayloadItem(
      {
        id: media.id,
        media_asset_id: media.id,
        position: idx,
        duration_override_seconds: null,
        transition_type: null,
      },
      media,
      urlByMediaId.get(media.id),
    ),
  );

  if (items.length === 0) return null;

  return {
    screen_id: screen.id,
    organization_id: screen.organization_id,
    campaign_id: null,
    playlist_id: null,
    payload_version: `org-media-fallback:${screen.id}:${items.length}`,
    valid_until: null,
    priority: null,
    items,
  };
}

async function refreshPayloadMediaUrls(
  payload: unknown,
  organizationId: string,
): Promise<unknown> {
  const payloadObj = (payload ?? null) as { items?: unknown[] } | null;
  const items = Array.isArray(payloadObj?.items) ? (payloadObj?.items ?? []) : [];
  if (items.length === 0) return payload;

  const mediaIds = Array.from(
    new Set(
      items
        .map((it) => String((it as { media_asset_id?: string }).media_asset_id ?? ""))
        .filter((id) => id.length > 0),
    ),
  );
  if (mediaIds.length === 0) return payload;

  const { data: medias, error } = await adminClient
    .from("media_assets")
    .select(
      "id, name, file_type, category, tags, public_url, file_path, thumbnail_url, duration_seconds, mime_type, status, valid_from, valid_until, updated_at",
    )
    .in("id", mediaIds)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const mediaRows = (medias ?? []) as MediaRow[];
  const urlPairs = await Promise.all(
    mediaRows.map(async (media) => ({
      mediaId: media.id,
      url: await resolvePlayableMediaUrl(media),
    })),
  );
  const urlByMediaId = new Map<string, string>(urlPairs.map((p) => [p.mediaId, p.url]));

  return {
    ...(payloadObj ?? {}),
    items: items.map((item) => {
      const mediaId = String((item as { media_asset_id?: string }).media_asset_id ?? "");
      const nextUrl = urlByMediaId.get(mediaId);
      if (!nextUrl) return item;
      return { ...(item as Record<string, unknown>), media_url: nextUrl };
    }),
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
  if (pairing?.screen_id && pairing?.used_at) return String(pairing.screen_id);

  // Compatibilidade com fluxos antigos/incompletos em que a tela foi criada
  // com pairing_code, mas pairing_codes não recebeu o vínculo screen_id.
  const legacyScreenId = await resolveLegacyScreenIdByPairingCode(code);
  if (!legacyScreenId) return "";

  await adminClient
    .from("pairing_codes")
    .update({
      screen_id: legacyScreenId,
      used_at: pairing?.used_at ?? new Date().toISOString(),
    })
    .eq("code", code)
    .is("screen_id", null);

  return legacyScreenId;
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
  const { data: campaignResolved, error: resolveError } = await adminClient.rpc(
    "resolve_screen_campaign",
    {
      p_screen_id: screen.id,
    },
  );
  if (resolveError) throw new Error(resolveError.message);
  const campaignCandidate = (Array.isArray(campaignResolved)
    ? campaignResolved[0]
    : campaignResolved) as { campaign_id?: string | null } | null;
  if (!campaignCandidate?.campaign_id) return null;

  const { data: campaigns, error: campaignError } = await adminClient
    .from("campaigns")
    .select("id, name, playlist_id, priority, start_at, end_at, status, updated_at")
    .eq("organization_id", screen.organization_id)
    .in("status", ["active", "scheduled"])
    .eq("id", campaignCandidate.campaign_id)
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
      return { link, media };
    })
    .filter((v) => v != null) as Array<{ link: PlaylistLinkRow; media: MediaRow }>;

  const urlPairs = await Promise.all(
    items.map(async ({ media }) => ({
      mediaId: media.id,
      url: await resolvePlayableMediaUrl(media),
    })),
  );
  const urlByMediaId = new Map<string, string>(urlPairs.map((p) => [p.mediaId, p.url]));
  const mappedItems = items.map(({ link, media }) =>
    mapMediaToPayloadItem(link, media, urlByMediaId.get(media.id)),
  );

  if (mappedItems.length === 0) return null;

  return {
    screen_id: screen.id,
    organization_id: screen.organization_id,
    campaign_id: campaign.id,
    playlist_id: playlistRow.id,
    payload_version: `${campaign.id}:${playlistRow.updated_at ?? campaign.updated_at ?? ""}`,
    valid_until: campaign.end_at,
    priority: campaign.priority,
    items: mappedItems,
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

  const rpcPayloadWithUrls = rpcPayload
    ? await refreshPayloadMediaUrls(rpcPayload, screen.organization_id)
    : null;
  const primaryPayload = rpcPayloadWithUrls ?? (await loadPayloadFromCampaignFallback(screen));
  const payload =
    extractItems(primaryPayload).length > 0
      ? primaryPayload
      : (await loadOrgMediaFallbackPayload(screen)) ?? primaryPayload;
  const playlist = extractItems(payload);

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
