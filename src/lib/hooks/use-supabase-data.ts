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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlist_items")
        .select(
          "id, playlist_id, media_asset_id, position, duration_override_seconds, transition_type, created_at, media_assets(id, name, file_type, public_url, thumbnail_url, mime_type, duration_seconds)",
        )
        .eq("playlist_id", playlistId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlaylistItemWithMedia[];
    },
  });
}

export function useAddPlaylistItem() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async ({ playlistId, mediaAssetId }: { playlistId: string; mediaAssetId: string }) => {
      if (!orgId) throw new Error("Sem organização ativa.");
      const { data: existing, error: selErr } = await supabase
        .from("playlist_items")
        .select("position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: false })
        .limit(1);
      if (selErr) throw selErr;
      const maxPos = existing?.[0]?.position;
      const nextPosition = typeof maxPos === "number" ? maxPos + 1 : 1;
      const { error } = await supabase.from("playlist_items").insert({
        playlist_id: playlistId,
        media_asset_id: mediaAssetId,
        position: nextPosition,
      });
      if (error) throw error;
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
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["playlist_items", orgId, vars.playlistId] });
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
