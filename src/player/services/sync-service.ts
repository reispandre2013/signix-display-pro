import { hasSupabaseEnv } from "@/lib/supabase-client";
import { cacheMediaItems } from "@/player/services/media-cache";
import { resolveScreenPayload } from "@/player/services/player-api";
import { getCachedPayload, setCachedPayload } from "@/player/storage/player-local";
import type { PlayerPayload } from "@/player/types";
import { validatePayload } from "@/player/validators/payload-validator";

export async function syncPlayerPayload(
  screenId: string,
): Promise<{ payload: PlayerPayload; fromCache: boolean }> {
  if (!hasSupabaseEnv) {
    const empty: PlayerPayload = {
      screen_id: screenId,
      organization_id: "",
      campaign_id: "",
      playlist_id: "",
      payload_version: "offline-preview",
      valid_until: null,
      items: [],
    };
    return { payload: empty, fromCache: true };
  }

  try {
    const payload = validatePayload(await resolveScreenPayload(screenId));
    await cacheMediaItems(payload.items);
    await setCachedPayload(payload);
    return { payload, fromCache: false };
  } catch (error) {
    const cached = await getCachedPayload();
    if (cached) {
      return { payload: validatePayload(cached), fromCache: true };
    }

    throw error;
  }
}
