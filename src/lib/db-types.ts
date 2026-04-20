// Tipos derivados do schema real do Supabase (signix project).
// Inspeção em public.* — mantenha sincronizado quando rodar migrations.

export type AppRole = "admin_master" | "gestor" | "operador" | "visualizador";
export type RecordStatus = "active" | "inactive" | "draft" | "archived" | "suspended";
export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "ended";
export type DeviceStatus = "online" | "offline" | "warning" | "syncing" | "maintenance";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type ScreenOrientation = "horizontal" | "vertical";
export type SyncStatus = "success" | "failed" | "partial";
export type TargetType = "screen" | "unit" | "group";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  timezone: string;
  language: string;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  organization_id: string;
  name: string;
  email: string;
  role: AppRole;
  status: RecordStatus;
  unit_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  created_at: string;
}

export interface Unit {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  status: RecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Screen {
  id: string;
  organization_id: string;
  unit_id: string | null;
  name: string;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  orientation: ScreenOrientation;
  resolution: string | null;
  platform: string | null;
  /** playstore | tizen | sideload | internal */
  store_type?: string | null;
  os_name: string | null;
  player_version: string | null;
  device_fingerprint: string | null;
  last_seen_at: string | null;
  last_sync_at: string | null;
  is_online: boolean;
  device_status: DeviceStatus;
  current_campaign_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenGroup {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  organization_id: string;
  name: string;
  file_type: string;
  category: string | null;
  tags: string[];
  file_path: string;
  public_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size: number | null;
  mime_type: string | null;
  valid_from: string | null;
  valid_until: string | null;
  status: RecordStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: RecordStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Linha em `playlist_items` (migration `20260418210000_playlist_items.sql`). */
export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_asset_id: string;
  position: number;
  duration_override_seconds?: number | null;
  transition_type?: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  playlist_id: string;
  priority: number;
  start_at: string;
  end_at: string;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignSchedule {
  id: string;
  campaign_id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence_rule: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignTarget {
  id: string;
  campaign_id: string;
  target_type: TargetType;
  target_id: string;
  created_at: string;
}

export interface Alert {
  id: string;
  organization_id: string;
  screen_id: string | null;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  resolved_at: string | null;
  status: RecordStatus;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_profile_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface PairingCode {
  id: string;
  code: string;
  organization_id: string | null;
  screen_id: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  /** android | tizen | web */
  player_platform?: string | null;
}
