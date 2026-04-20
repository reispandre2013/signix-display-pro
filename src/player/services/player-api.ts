import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase-client";
import type { PairingResult, PlaybackLog, PlayerPayload } from "@/player/types";
import { PLAYER_VERSION_LABEL } from "@/player/version";
import { validatePayload } from "@/player/validators/payload-validator";

interface ResolveCampaignResult {
  screen_id: string;
  organization_id: string;
  campaign_id?: string | null;
  playlist_id?: string | null;
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

/** Normaliza o código introduzido na TV (espaços, hífens alternativos, maiúsculas). */
export function normalizePairingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[·•‧]/g, "-").replace(/_/g, "-");
}

function mapPairingRpcError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid or expired pairing")) {
    return "Código não encontrado ou expirado. Verifique se a TV mostra o mesmo código que em Dispositivos › pareamento no painel; se necessário, gere um código novo.";
  }
  return raw.length > 0 ? raw : "Falha no pareamento.";
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
  const pairingCode = normalizePairingCode(code);
  if (pairingCode.length < 8) {
    throw new Error("Introduza o código completo (formato ABCD-EFGH).");
  }

  try {
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
      pairingCode,
      deviceFingerprint: fingerprint,
      platform: navigator.platform,
      osName: navigator.userAgent,
      playerVersion: PLAYER_VERSION_LABEL,
    });

    if (!result.screen) {
      throw new Error(mapPairingRpcError("invalid or expired pairing code"));
    }
    return result.screen;
  } catch (e) {
    const raw = e instanceof Error ? e.message : "";
    throw new Error(mapPairingRpcError(raw));
  }
}

export async function resolveScreenPayload(screenId: string): Promise<PlayerPayload> {
  const response = await postFunction<
    { screenId: string },
    { payload: ResolveCampaignResult | null }
  >("resolve-screen-playlist", {
    screenId,
  });

  const p = response.payload;
  const items = p?.items ?? [];
  if (items.length === 0) {
    throw new Error("Nenhum item ativo encontrado para esta tela.");
  }

  const payload: PlayerPayload = {
    screen_id: p?.screen_id || screenId,
    organization_id: p?.organization_id ?? "",
    campaign_id: p?.campaign_id ?? null,
    playlist_id: p?.playlist_id ?? null,
    payload_version: p?.payload_version ?? "unknown",
    valid_until: p?.valid_until ?? null,
    priority: p?.priority,
    items,
  };

  return validatePayload(payload);
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
