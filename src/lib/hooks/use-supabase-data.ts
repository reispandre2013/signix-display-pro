import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type {
  Alert,
  AuditLog,
  Campaign,
  CampaignSchedule,
  MediaAsset,
  Organization,
  PairingCode,
  Playlist,
  PlaylistItem,
  Profile,
  Screen,
  ScreenPlaylistAssignment,
  ScreenGroupPlaylistAssignment,
  ScreenGroup,
  Unit,
} from "@/lib/db-types";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* -------------------------------------------------------------------------- */

function useOrgId() {
  const { profile } = useAuth();
  return profile?.organization_id ?? null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isMissingColumnError(error: unknown, column: string): boolean {
  const msg = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return msg.includes(`column ${column.toLowerCase()}`) || msg.includes(`"${column.toLowerCase()}"`);
}

function isMissingFunctionError(error: unknown, fnName: string): boolean {
  const msg = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return msg.includes(`function ${fnName.toLowerCase()}`) || msg.includes("could not find the function");
}

function isMissingRelationError(error: unknown, relation: string): boolean {
  const msg = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    msg.includes(`relation "${relation.toLowerCase()}" does not exist`) ||
    msg.includes(`relation ${relation.toLowerCase()} does not exist`) ||
    msg.includes(`could not find the table '${relation.toLowerCase()}'`)
  );
}

async function safeReindexPlaylist(playlistId: string): Promise<void> {
  const timeoutMs = 2500;
  const rpcPromise = withTimeout(
    supabase.rpc("reindex_playlist_items", { p_playlist_id: playlistId }),
    timeoutMs,
    "Timeout ao reindexar playlist.",
  );
  const timed = (await Promise.race([
    rpcPromise,
    new Promise<{ timeout: true }>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), timeoutMs);
    }),
  ])) as Awaited<ReturnType<typeof supabase.rpc>> | { timeout: true };

  if ("timeout" in timed) {
    console.warn("[playlist] reindex timeout, seguindo sem bloquear UI.");
    return;
  }
  if (timed.error) {
    if (isMissingFunctionError(timed.error, "reindex_playlist_items")) {
      console.warn("[playlist] RPC reindex_playlist_items indisponível neste ambiente.");
      return;
    }
    console.warn("[playlist] reindex error:", timed.error.message);
  }
}

async function fetchPlaylistItemsCompat(playlistId: string): Promise<PlaylistItemWithMedia[]> {
  const fullSelect =
    "id, playlist_id, media_asset_id, position, duration_override_seconds, transition_type, fit_mode, is_active, notes, created_at, updated_at, media_assets(id, name, file_type, public_url, thumbnail_url, mime_type, duration_seconds)";
  const legacySelect =
    "id, playlist_id, media_asset_id, position, duration_override_seconds, transition_type, created_at, media_assets(id, name, file_type, public_url, thumbnail_url, mime_type, duration_seconds)";

  const first = await withTimeout(
    supabase.from("playlist_items").select(fullSelect).eq("playlist_id", playlistId).order("position", { ascending: true }),
    12000,
    "Timeout ao listar itens da playlist.",
  );

  if (!first.error) {
    return (first.data ?? []).map((row) => {
      const media = Array.isArray(row.media_assets) ? (row.media_assets[0] ?? null) : row.media_assets;
      return { ...(row as PlaylistItemWithMedia), media_assets: media as PlaylistItemWithMedia["media_assets"] };
    });
  }

  if (
    !isMissingColumnError(first.error, "fit_mode") &&
    !isMissingColumnError(first.error, "is_active") &&
    !isMissingColumnError(first.error, "notes") &&
    !isMissingColumnError(first.error, "updated_at")
  ) {
    throw first.error;
  }

  const legacy = await withTimeout(
    supabase.from("playlist_items").select(legacySelect).eq("playlist_id", playlistId).order("position", { ascending: true }),
    12000,
    "Timeout ao listar itens da playlist (modo compatível).",
  );
  if (legacy.error) throw legacy.error;

  return (legacy.data ?? []).map((row) => {
    const media = Array.isArray(row.media_assets) ? (row.media_assets[0] ?? null) : row.media_assets;
    return {
      ...(row as PlaylistItemWithMedia),
      fit_mode: "cover",
      is_active: true,
      notes: null,
      updated_at: (row as { created_at?: string }).created_at ?? null,
      media_assets: media as PlaylistItemWithMedia["media_assets"],
    } as PlaylistItemWithMedia;
  });
}

async function insertPlaylistMediaItems(opts: {
  playlistId: string;
  mediaAssetIds: string[];
}): Promise<{ inserted: number; skippedAsDuplicate: number }> {
  const mediaAssetIds = Array.from(new Set(opts.mediaAssetIds.map((x) => x.trim()).filter(Boolean)));
  if (mediaAssetIds.length === 0) return { inserted: 0, skippedAsDuplicate: 0 };

  await safeReindexPlaylist(opts.playlistId);

  const existingRes = await withTimeout(
    supabase
      .from("playlist_items")
      .select("media_asset_id, position")
      .eq("playlist_id", opts.playlistId)
      .order("position", { ascending: false }),
    12000,
    "Timeout ao verificar mídias já existentes na playlist.",
  );
  if (existingRes.error) throw existingRes.error;

  const existing = existingRes.data ?? [];
  const existingMediaIds = new Set(existing.map((r) => String(r.media_asset_id)));
  const toInsert = mediaAssetIds.filter((id) => !existingMediaIds.has(id));
  if (toInsert.length === 0) {
    return { inserted: 0, skippedAsDuplicate: mediaAssetIds.length };
  }

  let nextPosition = 1;
  const maxPos = existing.find((r) => typeof r.position === "number")?.position;
  if (typeof maxPos === "number") nextPosition = maxPos + 1;

  const rows = toInsert.map((mediaAssetId, idx) => ({
    playlist_id: opts.playlistId,
    media_asset_id: mediaAssetId,
    position: nextPosition + idx,
  }));

  const { error } = await withTimeout(
    supabase.from("playlist_items").insert(rows),
    12000,
    "Timeout ao inserir mídia(s) na playlist.",
  );
  if (error) throw error;

  await safeReindexPlaylist(opts.playlistId);

  return {
    inserted: rows.length,
    skippedAsDuplicate: mediaAssetIds.length - rows.length,
  };
}

/* -------------------------------------------------------------------------- */
/* QUERIES                                                                     */
/* -------------------------------------------------------------------------- */

export function useOrganization() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["organization", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as Organization | null;
    },
  });
}

export function useUnits() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["units", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Unit[];
    },
  });
}

export function useScreens() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["screens", orgId],
    enabled: !!orgId,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screens")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Screen[];
    },
  });
}

export function useScreenGroups() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["screen_groups", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screen_groups")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScreenGroup[];
    },
  });
}

export function useMedia() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["media", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MediaAsset[];
    },
  });
}

export function usePlaylists() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["playlists", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("*, playlist_items(count)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Playlist & { playlist_items?: { count: number }[] })[];
    },
  });
}

export type PlaylistItemWithMedia = PlaylistItem & {
  media_assets: Pick<
    MediaAsset,
    "id" | "name" | "file_type" | "public_url" | "thumbnail_url" | "mime_type" | "duration_seconds"
  > | null;
};

export function usePlaylistItems(playlistId: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["playlist_items", orgId, playlistId],
    enabled: !!orgId && !!playlistId,
    queryFn: async () => fetchPlaylistItemsCompat(playlistId!),
  });
}

export function useAddPlaylistItem() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async ({ playlistId, mediaAssetId }: { playlistId: string; mediaAssetId: string }) => {
      if (!orgId) throw new Error("Sem organização ativa.");
      const r = await insertPlaylistMediaItems({ playlistId, mediaAssetIds: [mediaAssetId] });
      if (r.inserted === 0) throw new Error("Esta mídia já está na playlist.");
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist_items", orgId, vars.playlistId] });
      qc.invalidateQueries({ queryKey: ["playlists", orgId] });
    },
  });
}

export function useDeletePlaylistItem() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async ({ id, playlistId }: { id: string; playlistId: string }) => {
      const { error } = await supabase.from("playlist_items").delete().eq("id", id);
      if (error) throw error;
      return { id, playlistId };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist_items", orgId, vars.playlistId] });
      qc.invalidateQueries({ queryKey: ["playlists", orgId] });
    },
  });
}

export function useSwapPlaylistItemPositions() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (vars: {
      playlistId: string;
      itemIdA: string;
      itemIdB: string;
      posA: number;
      posB: number;
    }) => {
      const temp = 9_000_000 + Math.floor(Math.random() * 100_000);
      const { itemIdA, itemIdB, posA, posB } = vars;
      const tbl = supabase.from("playlist_items");
      let { error } = await tbl.update({ position: temp }).eq("id", itemIdA);
      if (error) throw error;
      ({ error } = await tbl.update({ position: posA }).eq("id", itemIdB));
      if (error) throw error;
      ({ error } = await tbl.update({ position: posB }).eq("id", itemIdA));
      if (error) throw error;
      await safeReindexPlaylist(vars.playlistId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist_items", orgId, vars.playlistId] });
    },
  });
}

export function useReorderPlaylistItems() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (vars: { playlistId: string; orderedItemIds: string[] }) => {
      const { error } = await supabase.rpc("reorder_playlist_items", {
        p_playlist_id: vars.playlistId,
        p_ordered_ids: vars.orderedItemIds,
      });
      if (error) {
        if (!isMissingFunctionError(error, "reorder_playlist_items")) throw error;
        // fallback compatível com ambientes antigos sem a RPC.
        for (let i = 0; i < vars.orderedItemIds.length; i += 1) {
          const id = vars.orderedItemIds[i]!;
          const { error: upErr } = await supabase
            .from("playlist_items")
            .update({ position: -(i + 1) })
            .eq("id", id)
            .eq("playlist_id", vars.playlistId);
          if (upErr) throw upErr;
        }
        for (let i = 0; i < vars.orderedItemIds.length; i += 1) {
          const id = vars.orderedItemIds[i]!;
          const { error: upErr } = await supabase
            .from("playlist_items")
            .update({ position: i + 1 })
            .eq("id", id)
            .eq("playlist_id", vars.playlistId);
          if (upErr) throw upErr;
        }
      }
      await safeReindexPlaylist(vars.playlistId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist_items", orgId, vars.playlistId] });
      qc.invalidateQueries({ queryKey: ["playlists", orgId] });
    },
  });
}

export function useUpdatePlaylistItem() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      playlistId: string;
      patch: Partial<
        Pick<PlaylistItem, "duration_override_seconds" | "fit_mode" | "is_active" | "notes" | "transition_type">
      >;
    }) => {
      const { error } = await supabase.from("playlist_items").update(vars.patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist_items", orgId, vars.playlistId] });
      qc.invalidateQueries({ queryKey: ["playlists", orgId] });
    },
  });
}

export function useAddPlaylistItemsBulk() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (vars: { playlistId: string; mediaAssetIds: string[] }) => {
      if (!orgId) throw new Error("Sem organização ativa.");
      const r = await insertPlaylistMediaItems(vars);
      if (r.inserted === 0) throw new Error("Todas as mídias selecionadas já estão na playlist.");
      return r;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist_items", orgId, vars.playlistId] });
      qc.invalidateQueries({ queryKey: ["playlists", orgId] });
    },
  });
}

export function useScreenPrimaryPlaylistAssignment(screenId: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["screen_primary_playlist", orgId, screenId],
    enabled: !!orgId && !!screenId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screen_playlist_assignments")
        .select("*, playlists(id, name)")
        .eq("organization_id", orgId!)
        .eq("screen_id", screenId!)
        .eq("assignment_type", "primary")
        .eq("is_active", true)
        .maybeSingle();
      if (error) {
        if (isMissingRelationError(error, "screen_playlist_assignments")) {
          console.warn("[screen] tabela screen_playlist_assignments ausente; usando fallback de campanha.");
          return null;
        }
        throw error;
      }
      return data as (ScreenPlaylistAssignment & { playlists?: { id: string; name: string } | null }) | null;
    },
  });
}

export function useSetScreenPrimaryPlaylist() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (vars: { screenId: string; playlistId: string | null }) => {
      if (!orgId) throw new Error("Sem organização ativa.");
      const { error: offErr } = await supabase
        .from("screen_playlist_assignments")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("organization_id", orgId)
        .eq("screen_id", vars.screenId)
        .eq("assignment_type", "primary");
      if (offErr) {
        if (isMissingRelationError(offErr, "screen_playlist_assignments")) {
          throw new Error("Migração pendente: tabela de atribuição de playlist por tela não encontrada.");
        }
        throw offErr;
      }
      if (!vars.playlistId) return;
      const { error } = await supabase.from("screen_playlist_assignments").insert({
        organization_id: orgId,
        screen_id: vars.screenId,
        playlist_id: vars.playlistId,
        assignment_type: "primary",
        priority: 90,
        is_active: true,
      });
      if (error) {
        if (isMissingRelationError(error, "screen_playlist_assignments")) {
          throw new Error("Migração pendente: tabela de atribuição de playlist por tela não encontrada.");
        }
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["screen_primary_playlist", orgId, vars.screenId] });
      qc.invalidateQueries({ queryKey: ["screens", orgId] });
    },
  });
}

export function useScreenGroupPrimaryPlaylistAssignment(screenGroupId: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["screen_group_primary_playlist", orgId, screenGroupId],
    enabled: !!orgId && !!screenGroupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screen_group_playlist_assignments")
        .select("*, playlists(id, name)")
        .eq("organization_id", orgId!)
        .eq("screen_group_id", screenGroupId!)
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        if (isMissingRelationError(error, "screen_group_playlist_assignments")) {
          console.warn("[group] tabela screen_group_playlist_assignments ausente; usando fallback de campanha.");
          return null;
        }
        throw error;
      }
      return data as (ScreenGroupPlaylistAssignment & { playlists?: { id: string; name: string } | null }) | null;
    },
  });
}

export function useSetScreenGroupPrimaryPlaylist() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (vars: { screenGroupId: string; playlistId: string | null }) => {
      if (!orgId) throw new Error("Sem organização ativa.");
      const { error: offErr } = await supabase
        .from("screen_group_playlist_assignments")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("organization_id", orgId)
        .eq("screen_group_id", vars.screenGroupId);
      if (offErr) {
        if (isMissingRelationError(offErr, "screen_group_playlist_assignments")) {
          throw new Error("Migração pendente: tabela de atribuição de playlist por grupo não encontrada.");
        }
        throw offErr;
      }
      if (!vars.playlistId) return;
      const { error } = await supabase.from("screen_group_playlist_assignments").insert({
        organization_id: orgId,
        screen_group_id: vars.screenGroupId,
        playlist_id: vars.playlistId,
        priority: 65,
        is_active: true,
      });
      if (error) {
        if (isMissingRelationError(error, "screen_group_playlist_assignments")) {
          throw new Error("Migração pendente: tabela de atribuição de playlist por grupo não encontrada.");
        }
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["screen_group_primary_playlist", orgId, vars.screenGroupId] });
      qc.invalidateQueries({ queryKey: ["screen_groups", orgId] });
    },
  });
}

export function useCampaigns() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["campaigns", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });
}

export function useCampaignSchedules() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["campaign_schedules", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      // join via campaign org_id
      const { data, error } = await supabase
        .from("campaign_schedules")
        .select("*, campaigns!inner(organization_id, name)")
        .eq("campaigns.organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (CampaignSchedule & { campaigns: { name: string } })[];
    },
  });
}

export function useAlerts() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["alerts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });
}

export function useAuditLogs() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["audit_logs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });
}

export function useUsers() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["users_profiles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function usePairingCodes() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["pairing_codes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pairing_codes")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PairingCode[];
    },
  });
}

/* -------------------------------------------------------------------------- */
/* MUTATIONS                                                                   */
/* -------------------------------------------------------------------------- */

function useGenericInsert<T extends { organization_id?: string }>(
  table: string,
  invalidateKey: string,
) {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (payload: Partial<T>) => {
      if (!orgId) throw new Error("Sem organização ativa.");
      const row = { ...payload, organization_id: orgId } as Record<string, unknown>;
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [invalidateKey, orgId] }),
  });
}

function useGenericUpdate<T>(table: string, invalidateKey: string) {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<T> & { id: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update(patch as Record<string, unknown>)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [invalidateKey, orgId] }),
  });
}

function useGenericDelete(table: string, invalidateKey: string) {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [invalidateKey, orgId] }),
  });
}

// ---- Units ----
export const useCreateUnit = () => useGenericInsert<Unit>("units", "units");
export const useUpdateUnit = () => useGenericUpdate<Unit>("units", "units");
export const useDeleteUnit = () => useGenericDelete("units", "units");

// ---- Screens ----
export const useCreateScreen = () => useGenericInsert<Screen>("screens", "screens");
export const useUpdateScreen = () => useGenericUpdate<Screen>("screens", "screens");
export const useDeleteScreen = () => useGenericDelete("screens", "screens");

// ---- Screen groups ----
export const useCreateScreenGroup = () =>
  useGenericInsert<ScreenGroup>("screen_groups", "screen_groups");
export const useDeleteScreenGroup = () => useGenericDelete("screen_groups", "screen_groups");

// ---- Playlists ----
export const useCreatePlaylist = () => useGenericInsert<Playlist>("playlists", "playlists");
export const useUpdatePlaylist = () => useGenericUpdate<Playlist>("playlists", "playlists");
export const useDeletePlaylist = () => useGenericDelete("playlists", "playlists");

// ---- Campaigns ----
export const useCreateCampaign = () => useGenericInsert<Campaign>("campaigns", "campaigns");
export const useUpdateCampaign = () => useGenericUpdate<Campaign>("campaigns", "campaigns");
export const useDeleteCampaign = () => useGenericDelete("campaigns", "campaigns");

// ---- Media ----
export const useCreateMedia = () => useGenericInsert<MediaAsset>("media_assets", "media");
export const useUpdateMedia = () => useGenericUpdate<MediaAsset>("media_assets", "media");
export const useDeleteMedia = () => useGenericDelete("media_assets", "media");

// ---- Alerts ----
export function useResolveAlert() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ resolved_at: new Date().toISOString(), status: "inactive" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", orgId] }),
  });
}

// ---- Pairing ----
export function useGeneratePairingCode() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sem organização ativa.");
      const code = `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      const { data, error } = await supabase
        .from("pairing_codes")
        .insert({ code, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data as PairingCode;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pairing_codes", orgId] }),
  });
}
