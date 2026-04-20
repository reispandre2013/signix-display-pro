export type MediaType = "image" | "video" | "banner" | "html";

export interface PlaylistItemPayload {
  id: string;
  media_asset_id: string;
  media_type: MediaType;
  media_url: string;
  thumbnail_url?: string | null;
  duration_seconds: number;
  position: number;
  transition_type?: string | null;
  checksum?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PlayerPayload {
  screen_id: string;
  organization_id: string;
  /** Presente quando a playlist vem de campanha; null no fallback só com mídias da organização. */
  campaign_id: string | null;
  playlist_id: string | null;
  payload_version: string;
  valid_until?: string | null;
  priority?: number;
  items: PlaylistItemPayload[];
  metadata?: Record<string, unknown>;
}

export interface PairingResult {
  screen_id: string;
  organization_id: string;
  unit_id: string | null;
  screen_name: string;
  paired: boolean;
  /** android | tizen — devolvido pela RPC após migration 20260419120000. */
  platform?: string;
}

export interface LocalScreenCredentials {
  screenId: string;
  organizationId: string;
  screenName: string;
  fingerprint: string;
  pairedAt: string;
}

export interface PlaybackLog {
  id: string;
  screenId: string;
  campaignId?: string | null;
  playlistId?: string | null;
  mediaAssetId?: string | null;
  itemId?: string | null;
  playbackStatus: "started" | "ended" | "failed" | "skipped";
  startedAt?: string;
  endedAt?: string;
  durationPlayed?: number;
  errorMessage?: string;
  localEventId: string;
}

export interface PlayerSettings {
  orientation: "auto" | "horizontal" | "vertical";
  defaultVolume: number;
  heartbeatSeconds: number;
  syncSeconds: number;
  debugMode: boolean;
}

export type PlayerRuntimeStage = "activation" | "loading" | "playing" | "fallback";
