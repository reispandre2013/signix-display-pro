import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRow = {
  id: string;
  auth_user_id: string;
  organization_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  unit_id: string | null;
};

export async function fetchProfile(client: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

export async function fetchOrganization(client: SupabaseClient, orgId: string) {
  const { data, error } = await client.from("organizations").select("*").eq("id", orgId).single();
  if (error) throw error;
  return data;
}

export async function updateOrganization(
  client: SupabaseClient,
  orgId: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await client.from("organizations").update(patch).eq("id", orgId).select().single();
  if (error) throw error;
  return data;
}

export async function fetchUnits(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("units")
    .select("*, screens(count)")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function insertUnit(
  client: SupabaseClient,
  orgId: string,
  row: { name: string; address?: string; city?: string; state?: string; manager_name?: string; manager_phone?: string },
) {
  const { data, error } = await client
    .from("units")
    .insert({ ...row, organization_id: orgId, status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUnit(client: SupabaseClient, unitId: string, patch: Record<string, unknown>) {
  const { data, error } = await client.from("units").update(patch).eq("id", unitId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteUnit(client: SupabaseClient, unitId: string) {
  const { error } = await client.from("units").delete().eq("id", unitId);
  if (error) throw error;
}

export async function fetchScreens(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("screens")
    .select("*, units(name), campaigns(name)")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function insertScreen(
  client: SupabaseClient,
  orgId: string,
  row: { name: string; unit_id?: string | null; resolution?: string },
) {
  const { data, error } = await client
    .from("screens")
    .insert({
      organization_id: orgId,
      name: row.name,
      unit_id: row.unit_id ?? null,
      resolution: row.resolution ?? "1920x1080",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateScreen(client: SupabaseClient, screenId: string, patch: Record<string, unknown>) {
  const { data, error } = await client.from("screens").update(patch).eq("id", screenId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteScreen(client: SupabaseClient, screenId: string) {
  const { error } = await client.from("screens").delete().eq("id", screenId);
  if (error) throw error;
}

export async function fetchMediaAssets(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("media_assets")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertMediaAsset(
  client: SupabaseClient,
  orgId: string,
  row: {
    name: string;
    file_type: string;
    file_path: string;
    public_url?: string | null;
    mime_type?: string | null;
    duration_seconds?: number | null;
    category?: string | null;
  },
) {
  const { data, error } = await client
    .from("media_assets")
    .insert({
      organization_id: orgId,
      name: row.name,
      file_type: row.file_type,
      file_path: row.file_path,
      public_url: row.public_url ?? null,
      mime_type: row.mime_type ?? null,
      duration_seconds: row.duration_seconds ?? null,
      category: row.category ?? null,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMediaAsset(client: SupabaseClient, id: string) {
  const { error } = await client.from("media_assets").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPlaylists(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("playlists")
    .select("*, playlist_items(count)")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertPlaylist(client: SupabaseClient, orgId: string, name: string, description?: string) {
  const { data, error } = await client
    .from("playlists")
    .insert({ organization_id: orgId, name, description: description ?? "", status: "draft" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlaylist(client: SupabaseClient, id: string) {
  const { error } = await client.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

export async function updatePlaylist(client: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { data, error } = await client.from("playlists").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function fetchPlaylistItems(client: SupabaseClient, playlistId: string) {
  const { data, error } = await client
    .from("playlist_items")
    .select("*, media_assets(*)")
    .eq("playlist_id", playlistId)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCampaigns(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("campaigns")
    .select("*, playlists(name)")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertCampaign(
  client: SupabaseClient,
  orgId: string,
  row: { name: string; playlist_id: string; start_at: string; end_at: string; priority?: number },
) {
  const { data, error } = await client
    .from("campaigns")
    .insert({
      organization_id: orgId,
      name: row.name,
      playlist_id: row.playlist_id,
      start_at: row.start_at,
      end_at: row.end_at,
      priority: row.priority ?? 50,
      status: "draft",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(client: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { data, error } = await client.from("campaigns").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(client: SupabaseClient, id: string) {
  const { error } = await client.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAlerts(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("alerts")
    .select("*, screens(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function updateAlert(client: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { data, error } = await client.from("alerts").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function fetchAuditLogs(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("audit_logs")
    .select("*, profiles(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function insertCampaignSchedule(
  client: SupabaseClient,
  row: {
    campaign_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    timezone?: string;
    recurrence_rule?: string | null;
  },
) {
  const { data, error } = await client
    .from("campaign_schedules")
    .insert({
      campaign_id: row.campaign_id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      timezone: row.timezone ?? "America/Sao_Paulo",
      recurrence_rule: row.recurrence_rule ?? null,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaignSchedule(client: SupabaseClient, scheduleId: string) {
  const { error } = await client.from("campaign_schedules").delete().eq("id", scheduleId);
  if (error) throw error;
}

export async function fetchScreenGroups(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("screen_groups")
    .select("*, screen_group_items(count)")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function insertScreenGroup(client: SupabaseClient, orgId: string, name: string, description?: string) {
  const { data, error } = await client
    .from("screen_groups")
    .insert({ organization_id: orgId, name, description: description ?? "", status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteScreenGroup(client: SupabaseClient, id: string) {
  const { error } = await client.from("screen_groups").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSchedules(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("campaign_schedules")
    .select("*, campaigns(name, organization_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []).filter((r: { campaigns: { organization_id: string } | null }) => {
    return r.campaigns?.organization_id === orgId;
  });
  return rows;
}

export async function fetchProfilesDirectory(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("*, units(name)")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function updateProfile(client: SupabaseClient, profileId: string, patch: Record<string, unknown>) {
  const { data, error } = await client.from("profiles").update(patch).eq("id", profileId).select().single();
  if (error) throw error;
  return data;
}

export async function fetchPlaybackLogs(client: SupabaseClient, orgId: string, sinceIso: string) {
  const { data, error } = await client
    .from("playback_logs")
    .select("*")
    .eq("organization_id", orgId)
    .gte("played_at", sinceIso)
    .order("played_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}

export function campaignStatusLabel(status: string): string {
  const m: Record<string, string> = {
    draft: "Rascunho",
    scheduled: "Agendada",
    active: "Ativa",
    paused: "Pausada",
    ended: "Encerrada",
  };
  return m[status] ?? status;
}

export function roleLabel(role: string): string {
  const m: Record<string, string> = {
    admin_master: "Admin Master",
    gestor: "Gestor",
    operador: "Operador",
    visualizador: "Visualizador",
  };
  return m[role] ?? role;
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
