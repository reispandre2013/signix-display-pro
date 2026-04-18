import { idbStore } from "@/player/storage/idb";
import type { PlaylistItemPayload } from "@/player/types";

/** Limite conservador de cache de blobs (mídias) no IndexedDB / WebView. */
const DEFAULT_MAX_CACHE_BYTES = 450 * 1024 * 1024;

function mediaCacheKey(item: PlaylistItemPayload): string {
  return item.checksum ?? `${item.media_asset_id}:${item.media_url}`;
}

/** Remove blobs mais antigos (ordem de chave no store) até ficar abaixo do limite. */
export async function pruneMediaCache(maxBytes: number = DEFAULT_MAX_CACHE_BYTES): Promise<void> {
  const keys = await idbStore.listMediaKeys();
  let total = 0;
  const sized: { key: string; size: number }[] = [];
  for (const key of keys) {
    const blob = await idbStore.getMedia(key);
    if (!blob) continue;
    sized.push({ key, size: blob.size });
    total += blob.size;
  }
  if (total <= maxBytes) return;
  sized.sort((a, b) => a.key.localeCompare(b.key));
  for (const { key, size } of sized) {
    if (total <= maxBytes) break;
    await idbStore.deleteMedia(key);
    total -= size;
  }
}

export async function cacheMediaItems(items: PlaylistItemPayload[]): Promise<void> {
  await Promise.all(
    items.map(async (item) => {
      try {
        const response = await fetch(item.media_url, { cache: "force-cache" });
        if (!response.ok) return;
        const blob = await response.blob();
        await idbStore.setMedia(mediaCacheKey(item), blob);
      } catch {
        // Ignore individual media errors to avoid blocking player sync.
      }
    }),
  );
  await pruneMediaCache().catch(() => undefined);
}

export async function getCachedMediaUrl(item: PlaylistItemPayload): Promise<string | null> {
  const blob = await idbStore.getMedia(mediaCacheKey(item));
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
