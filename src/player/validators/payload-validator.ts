import { z } from "zod";
import type { PlayerPayload } from "@/player/types";

const playlistItemSchema = z.object({
  id: z.string(),
  media_asset_id: z.string(),
  media_type: z.enum(["image", "video", "banner", "html"]),
  /** URL assinada ou externa; evitar só `.url()` para não falhar em edge cases do runtime. */
  media_url: z.string().min(1),
  thumbnail_url: z.string().nullable().optional(),
  duration_seconds: z.coerce.number().int().min(1),
  /** Edge `resolve-screen-playlist` pode usar índice 0 no fallback; DB de itens usa >= 1. */
  position: z.coerce.number().int().min(0),
  transition_type: z.string().nullable().optional(),
  checksum: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const nullableUuid = z.preprocess(
  (v) => (v === undefined || v === "" ? null : v),
  z.union([z.string().uuid(), z.null()]),
);

const playerPayloadSchema = z.object({
  screen_id: z.string(),
  organization_id: z.string(),
  campaign_id: nullableUuid,
  playlist_id: nullableUuid,
  payload_version: z.string(),
  valid_until: z.string().nullable().optional(),
  priority: z.number().optional(),
  items: z.array(playlistItemSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function validatePayload(payload: unknown): PlayerPayload {
  return playerPayloadSchema.parse(payload);
}
