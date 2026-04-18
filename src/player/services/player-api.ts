import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase-client";
import type { PairingResult, PlaybackLog, PlayerPayload } from "@/player/types";
import { PLAYER_VERSION_LABEL } from "@/player/version";

interface ResolveCampaignResult {
  screen_id: string;
  organization_id: string;
  campaign_id: string;
  playlist_id: string;
  payload_version: string;
  valid_until?: string | null;
  priority?: number;
  items: PlayerPayload["items"];
}

function buildFunctionUrl(name: string): string {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL não configurada");
  }
  return `${supabaseUrl}/functions/v1/${name}`;
}

async function postFunction<TReq, TRes>(name: string, payload: TReq): Promise<TRes> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabasePublishableKey();
  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase não configurado para o player.");
  }

  const response = await fetch(buildFunctionUrl(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as TRes & { error?: string };
  if (!response.ok || ("error" in data && data.error)) {
    throw new Error((data as { error?: string }).error ?? `Falha na função ${name}`);
  }
  return data;
}

export async function pairScreen(code: string, fingerprint: string): Promise<PairingResult> {
  const result = await postFunction<
    {
      pairingCode: string;
      deviceFingerprint: string;
      platform: string;
      osName: string;
      playerVersion: string;
    },
    { paired: boolean; screen: PairingResult | null }
  >("pair-screen", {
    pairingCode: code,
    deviceFingerprint: fingerprint,
    platform: navigator.platform,
    osName: navigator.userAgent,
    playerVersion: PLAYER_VERSION_LABEL,
  });

  if (!result.screen) {
    throw new Error("Código inválido ou expirado.");
  }
  return result.screen;
}

export async function resolveScreenPayload(screenId: string): Promise<PlayerPayload> {
  const response = await postFunction<
    { screenId: string },
    { payload: ResolveCampaignResult | null }
  >("resolve-screen-playlist", {
    screenId,
  });

  if (!response.payload?.campaign_id || !response.payload?.playlist_id) {
    throw new Error("Nenhuma campanha ativa para esta tela.");
  }

  const payload: PlayerPayload = {
    screen_id: response.payload.screen_id || screenId,
    organization_id: response.payload.organization_id,
    campaign_id: response.payload.campaign_id,
    playlist_id: response.payload.playlist_id,
    payload_version: response.payload.payload_version,
    valid_until: response.payload.valid_until ?? null,
    priority: response.payload.priority,
    items: response.payload.items ?? [],
  };

  if (payload.items.length === 0) {
    throw new Error("Campanha sem itens de playlist.");
  }
  return payload;
}

export async function sendHeartbeat(params: {
  screenId: string;
  isOk?: boolean;
  errorMessage?: string | null;
  networkStatus: string;
}): Promise<void> {
  await postFunction("heartbeat-screen", {
    screenId: params.screenId,
    appVersion: PLAYER_VERSION_LABEL,
    networkStatus: params.networkStatus,
    deviceInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    },
    isOk: params.isOk ?? true,
    errorMessage: params.errorMessage ?? null,
  });
}

export async function sendPlaybackLog(log: PlaybackLog): Promise<void> {
  await postFunction("generate-proof-of-play", {
    screenId: log.screenId,
    campaignId: log.campaignId ?? null,
    playlistId: log.playlistId ?? null,
    mediaAssetId: log.mediaAssetId ?? null,
    durationPlayed: log.durationPlayed ?? null,
    playbackStatus: log.playbackStatus,
    localEventId: log.localEventId,
  });
}
