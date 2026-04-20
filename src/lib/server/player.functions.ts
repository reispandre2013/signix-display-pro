import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizePlayerPlatform, type PlayerPlatform } from "@/lib/platform-capabilities";

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

async function assertScreenCredentials(screenId: string, pairingCode: string) {
  const code = normalizeCode(pairingCode);
  const { data: screen, error } = await supabaseAdmin
    .from("screens")
    .select("id, pairing_code, organization_id")
    .eq("id", screenId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!screen) throw new Error("Tela não encontrada.");
  if (!screen.pairing_code || normalizeCode(screen.pairing_code) !== code) {
    throw new Error("Credenciais do player inválidas.");
  }
  return screen;
}

type HeartbeatInput = {
  screen_id: string;
  pairing_code: string;
  platform?: string;
  app_version?: string | null;
  network_status?: string | null;
  storage_status?: string | null;
  player_status?: string | null;
  current_campaign_id?: string | null;
  current_media_id?: string | null;
  free_storage_mb?: number | null;
  screen_width?: number | null;
  screen_height?: number | null;
};

function validateHeartbeat(input: unknown): HeartbeatInput {
  if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
  const o = input as Record<string, unknown>;
  if (typeof o.screen_id !== "string" || !o.screen_id) throw new Error("screen_id obrigatório.");
  if (typeof o.pairing_code !== "string" || normalizeCode(o.pairing_code).length < 4)
    throw new Error("pairing_code obrigatório.");
  return {
    screen_id: o.screen_id,
    pairing_code: o.pairing_code as string,
    platform: typeof o.platform === "string" ? o.platform : undefined,
    app_version: typeof o.app_version === "string" ? o.app_version : null,
    network_status: typeof o.network_status === "string" ? o.network_status : null,
    storage_status: typeof o.storage_status === "string" ? o.storage_status : null,
    player_status: typeof o.player_status === "string" ? o.player_status : null,
    current_campaign_id: typeof o.current_campaign_id === "string" ? o.current_campaign_id : null,
    current_media_id: typeof o.current_media_id === "string" ? o.current_media_id : null,
    free_storage_mb: typeof o.free_storage_mb === "number" ? o.free_storage_mb : null,
    screen_width: typeof o.screen_width === "number" ? o.screen_width : null,
    screen_height: typeof o.screen_height === "number" ? o.screen_height : null,
  };
}

/**
 * Heartbeat público (sem JWT). Autenticação fraca por screen_id + pairing_code gravado na screen.
 * Evoluir para device_token dedicado quando possível.
 */
export const postPlayerHeartbeat = createServerFn({ method: "POST" })
  .inputValidator(validateHeartbeat)
  .handler(async ({ data }) => {
    await assertScreenCredentials(data.screen_id, data.pairing_code);
    const platform = normalizePlayerPlatform(data.platform) as PlayerPlatform;
    const now = new Date().toISOString();
    const resolution =
      data.screen_width && data.screen_height
        ? `${Math.round(data.screen_width)}x${Math.round(data.screen_height)}`
        : null;

    const { error: hbErr } = await supabaseAdmin.from("screen_heartbeats").insert({
      screen_id: data.screen_id,
      platform,
      app_version: data.app_version,
      network_status: data.network_status,
      storage_status: data.storage_status,
      player_status: data.player_status,
      current_campaign_id: data.current_campaign_id,
      current_media_id: data.current_media_id,
      free_storage_mb: data.free_storage_mb,
    });
    if (hbErr) {
      console.error("[postPlayerHeartbeat] insert heartbeat:", hbErr.message);
    }

    const patch: Record<string, unknown> = {
      last_seen_at: now,
      is_online: true,
      device_status: "online",
    };
    if (data.app_version) patch.player_version = data.app_version;
    if (resolution) patch.resolution = resolution;

    const { error: upErr } = await supabaseAdmin.from("screens").update(patch).eq("id", data.screen_id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, server_time: now };
  });

type LogInput = {
  screen_id: string;
  pairing_code: string;
  platform?: string;
  event_type: string;
  severity?: string;
  message?: string | null;
  payload_json?: Record<string, unknown> | null;
};

function validateLog(input: unknown): LogInput {
  if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
  const o = input as Record<string, unknown>;
  if (typeof o.screen_id !== "string" || !o.screen_id) throw new Error("screen_id obrigatório.");
  if (typeof o.pairing_code !== "string") throw new Error("pairing_code obrigatório.");
  if (typeof o.event_type !== "string" || !o.event_type.trim()) throw new Error("event_type obrigatório.");
  return {
    screen_id: o.screen_id,
    pairing_code: o.pairing_code,
    platform: typeof o.platform === "string" ? o.platform : undefined,
    event_type: o.event_type.trim(),
    severity: typeof o.severity === "string" ? o.severity : "info",
    message: typeof o.message === "string" ? o.message : null,
    payload_json:
      o.payload_json && typeof o.payload_json === "object" && !Array.isArray(o.payload_json)
        ? (o.payload_json as Record<string, unknown>)
        : null,
  };
}

export const postPlayerLog = createServerFn({ method: "POST" })
  .inputValidator(validateLog)
  .handler(async ({ data }) => {
    await assertScreenCredentials(data.screen_id, data.pairing_code);
    const platform = normalizePlayerPlatform(data.platform) as PlayerPlatform;
    const { error } = await supabaseAdmin.from("screen_logs").insert({
      screen_id: data.screen_id,
      platform,
      event_type: data.event_type,
      severity: data.severity ?? "info",
      message: data.message,
      payload_json: data.payload_json,
    });
    if (error) {
      console.error("[postPlayerLog]", error.message);
      throw new Error(error.message);
    }
    return { ok: true };
  });

/* -------------------------------------------------------------------------- */
/* Sync + playlist por screen_id (players Android / Tizen / Web)              */
/* -------------------------------------------------------------------------- */

type CampaignRow = {
  id: string;
  organization_id: string;
  name: string;
  playlist_id: string;
  priority: number;
  start_at: string;
  end_at: string;
  status: string;
};

function campaignActiveNow(c: CampaignRow): boolean {
  if (c.status !== "active") return false;
  const now = Date.now();
  return new Date(c.start_at).getTime() <= now && now <= new Date(c.end_at).getTime();
}

function buildPlaylistEtag(campaignId: string | null, itemIds: string[]): string {
  return `${campaignId ?? "none"}:${itemIds.join(",")}`;
}

const storageMediaBuckets = new Set(["media-images", "media-videos", "thumbnails"]);

function parseStorageObjectPath(rawPath: string | null | undefined): { bucket: string; objectPath: string } | null {
  const path = String(rawPath ?? "").trim();
  if (!path || /^https?:\/\//i.test(path)) return null;
  const slash = path.indexOf("/");
  if (slash <= 0) return null;
  const bucket = path.slice(0, slash);
  const objectPath = path.slice(slash + 1);
  if (!storageMediaBuckets.has(bucket) || !objectPath) return null;
  return { bucket, objectPath };
}

async function resolvePlayableMediaUrl(
  filePath: string | null | undefined,
  publicUrl: string | null | undefined,
): Promise<string | null> {
  const objectRef = parseStorageObjectPath(filePath);
  if (objectRef) {
    const { data, error } = await supabaseAdmin.storage
      .from(objectRef.bucket)
      .createSignedUrl(objectRef.objectPath, 60 * 60);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return publicUrl ?? filePath ?? null;
}

type GetPlaylistInput = {
  screen_id: string;
  pairing_code: string;
  platform?: string;
  etag?: string | null;
};

function validateGetPlaylist(input: unknown): GetPlaylistInput {
  if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
  const o = input as Record<string, unknown>;
  if (typeof o.screen_id !== "string" || !o.screen_id) throw new Error("screen_id obrigatório.");
  if (typeof o.pairing_code !== "string") throw new Error("pairing_code obrigatório.");
  return {
    screen_id: o.screen_id,
    pairing_code: o.pairing_code as string,
    platform: typeof o.platform === "string" ? o.platform : undefined,
    etag: typeof o.etag === "string" ? o.etag : null,
  };
}

export type ScreenPlaylistItem = {
  id: string;
  name: string;
  public_url: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  position: number;
};

/**
 * Devolve campanha activa + itens de playlist (ou fallback para mídias da org).
 * Autenticação: screen_id + pairing_code (igual ao gravado na screen após pareamento).
 */
export const getScreenPlaylistPayload = createServerFn({ method: "POST" })
  .inputValidator(validateGetPlaylist)
  .handler(async ({ data }) => {
    const screen = await assertScreenCredentials(data.screen_id, data.pairing_code);
    const orgId = screen.organization_id as string;

    const { data: screenRow, error: sErr } = await supabaseAdmin
      .from("screens")
      .select("id, name, organization_id, unit_id, platform, store_type")
      .eq("id", data.screen_id)
      .maybeSingle();
    if (sErr || !screenRow) throw new Error("Tela não encontrada.");

    const screenId = screenRow.id as string;
    const unitId = screenRow.unit_id as string | null;

    const orFilters = [`and(target_type.eq.screen,target_id.eq.${screenId})`];
    if (unitId) orFilters.push(`and(target_type.eq.unit,target_id.eq.${unitId})`);

    const { data: targets, error: tErr } = await supabaseAdmin
      .from("campaign_targets")
      .select("campaign_id")
      .or(orFilters.join(","));
    if (tErr) {
      console.error("[getScreenPlaylistPayload] targets", tErr.message);
    }
    const campaignIds = [...new Set((targets ?? []).map((t) => t.campaign_id as string))];

    let campaigns: CampaignRow[] = [];
    if (campaignIds.length > 0) {
      const { data: cRows, error: cErr } = await supabaseAdmin
        .from("campaigns")
        .select("id, organization_id, name, playlist_id, priority, start_at, end_at, status")
        .eq("organization_id", orgId)
        .in("id", campaignIds);
      if (cErr) throw new Error(cErr.message);
      campaigns = (cRows ?? []) as CampaignRow[];
    }

    const active = campaigns.filter(campaignActiveNow).sort((a, b) => b.priority - a.priority);
    const campaign = active[0] ?? null;

    let playlist: { id: string; name: string } | null = null;
    let items: ScreenPlaylistItem[] = [];
    let source: "playlist_items" | "org_media_fallback" | "empty" = "empty";

    if (campaign) {
      const { data: pRow } = await supabaseAdmin
        .from("playlists")
        .select("id, name")
        .eq("id", campaign.playlist_id)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (pRow) playlist = { id: pRow.id as string, name: pRow.name as string };

      const { data: links, error: liErr } = await supabaseAdmin
        .from("playlist_items")
        .select("media_asset_id, position")
        .eq("playlist_id", campaign.playlist_id)
        .order("position", { ascending: true });

      if (liErr) {
        console.warn("[getScreenPlaylistPayload] playlist_items:", liErr.message);
      }

      if (!liErr && links && links.length > 0) {
        const ids = links.map((l) => l.media_asset_id as string);
        const { data: medias, error: mErr } = await supabaseAdmin
          .from("media_assets")
          .select("id, name, file_path, public_url, thumbnail_url, mime_type, duration_seconds, status")
          .in("id", ids)
          .eq("organization_id", orgId);
        if (mErr) throw new Error(mErr.message);
        const byId = new Map((medias ?? []).map((m) => [m.id as string, m]));
        const playlistEntries = await Promise.all(
          links.map(async (l) => {
            const m = byId.get(l.media_asset_id as string);
            if (!m || m.status !== "active") return null;
            const mediaUrl = await resolvePlayableMediaUrl(
              m.file_path as string | null,
              m.public_url as string | null,
            );
            if (!mediaUrl) return null;
            return {
              id: m.id as string,
              name: (m.name as string) ?? "",
              public_url: mediaUrl,
              thumbnail_url: m.thumbnail_url as string | null,
              mime_type: m.mime_type as string | null,
              duration_seconds: m.duration_seconds as number | null,
              position: Number(l.position ?? 0),
            } satisfies ScreenPlaylistItem;
          }),
        );
        items = playlistEntries.filter((entry) => entry != null) as ScreenPlaylistItem[];
        items.sort((a, b) => a.position - b.position);
        source = items.length > 0 ? "playlist_items" : "empty";
      }

      if (items.length === 0) {
        const { data: fallback, error: fErr } = await supabaseAdmin
          .from("media_assets")
          .select("id, name, file_path, public_url, thumbnail_url, mime_type, duration_seconds, status")
          .eq("organization_id", orgId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(80);
        if (fErr) throw new Error(fErr.message);
        const fallbackEntries = await Promise.all(
          (fallback ?? []).map(async (m, idx) => {
            const mediaUrl = await resolvePlayableMediaUrl(
              m.file_path as string | null,
              m.public_url as string | null,
            );
            if (!mediaUrl) return null;
            return {
              id: m.id as string,
              name: (m.name as string) ?? "",
              public_url: mediaUrl,
              thumbnail_url: m.thumbnail_url as string | null,
              mime_type: m.mime_type as string | null,
              duration_seconds: m.duration_seconds as number | null,
              position: idx,
            } satisfies ScreenPlaylistItem;
          }),
        );
        items = fallbackEntries.filter((entry) => entry != null) as ScreenPlaylistItem[];
        source = items.length > 0 ? "org_media_fallback" : "empty";
      }

      await supabaseAdmin
        .from("screens")
        .update({ current_campaign_id: campaign.id })
        .eq("id", screenId);
    }

    const etag = buildPlaylistEtag(
      campaign?.id ?? null,
      items.map((i) => i.id),
    );
    if (data.etag && data.etag === etag) {
      return {
        ok: true as const,
        unchanged: true as const,
        etag,
        server_time: new Date().toISOString(),
      };
    }

    return {
      ok: true as const,
      unchanged: false as const,
      etag,
      server_time: new Date().toISOString(),
      screen: {
        id: screenRow.id as string,
        name: screenRow.name as string,
        organization_id: orgId,
        platform: (screenRow.platform as string | null) ?? "android",
        store_type: (screenRow.store_type as string | null) ?? null,
      },
      campaign: campaign
        ? {
            id: campaign.id,
            name: campaign.name,
            playlist_id: campaign.playlist_id,
            priority: campaign.priority,
          }
        : null,
      playlist,
      items,
      source,
    };
  });

type SyncAckInput = {
  screen_id: string;
  pairing_code: string;
  platform?: string;
  sync_type: string;
  sync_status: string;
  items_downloaded?: number | null;
  error_message?: string | null;
};

function validateSyncAck(input: unknown): SyncAckInput {
  if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
  const o = input as Record<string, unknown>;
  if (typeof o.screen_id !== "string" || !o.screen_id) throw new Error("screen_id obrigatório.");
  if (typeof o.pairing_code !== "string") throw new Error("pairing_code obrigatório.");
  if (typeof o.sync_type !== "string" || !o.sync_type.trim()) throw new Error("sync_type obrigatório.");
  if (typeof o.sync_status !== "string" || !o.sync_status.trim()) throw new Error("sync_status obrigatório.");
  return {
    screen_id: o.screen_id,
    pairing_code: o.pairing_code as string,
    platform: typeof o.platform === "string" ? o.platform : undefined,
    sync_type: o.sync_type.trim(),
    sync_status: o.sync_status.trim(),
    items_downloaded: typeof o.items_downloaded === "number" ? o.items_downloaded : null,
    error_message: typeof o.error_message === "string" ? o.error_message : null,
  };
}

/** Regista conclusão de sync + actualiza `last_sync_at` na screen. */
export const postPlayerSyncAck = createServerFn({ method: "POST" })
  .inputValidator(validateSyncAck)
  .handler(async ({ data }) => {
    await assertScreenCredentials(data.screen_id, data.pairing_code);
    const platform = normalizePlayerPlatform(data.platform) as PlayerPlatform;
    const now = new Date().toISOString();

    const { error: insErr } = await supabaseAdmin.from("screen_sync_history").insert({
      screen_id: data.screen_id,
      platform,
      sync_type: data.sync_type,
      sync_status: data.sync_status,
      items_downloaded: data.items_downloaded,
      started_at: now,
      finished_at: now,
      error_message: data.error_message,
    });
    if (insErr) console.error("[postPlayerSyncAck] history:", insErr.message);

    const { error: upErr } = await supabaseAdmin
      .from("screens")
      .update({
        last_sync_at: now,
        device_status: data.sync_status === "failed" ? "warning" : "online",
      })
      .eq("id", data.screen_id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, server_time: now };
  });
