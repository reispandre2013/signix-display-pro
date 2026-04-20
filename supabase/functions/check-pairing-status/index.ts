import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient } from "../_shared/client.ts";
import { readJson } from "../_shared/http.ts";

const corsJsonHeaders: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsJsonHeaders });
}

type Body = {
  code: string;
};

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

type ScreenInfo = {
  id: string;
  name: string | null;
  organization_id: string | null;
  unit_id: string | null;
  platform: string | null;
  store_type: string | null;
  orientation: string | null;
} | null;

async function findScreenByLegacyPairingCode(code: string): Promise<ScreenInfo> {
  if (!code) return null;
  const { data: screenRow, error } = await adminClient
    .from("screens")
    .select("id, name, organization_id, unit_id, platform, store_type, orientation")
    .eq("pairing_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!screenRow) return null;
  return {
    id: screenRow.id as string,
    name: (screenRow.name as string) ?? null,
    organization_id: (screenRow.organization_id as string) ?? null,
    unit_id: (screenRow.unit_id as string) ?? null,
    platform: (screenRow.platform as string) ?? null,
    store_type: (screenRow.store_type as string) ?? null,
    orientation: (screenRow.orientation as string) ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await readJson<Body>(req);
    const code = typeof body.code === "string" ? normalizeCode(body.code) : "";
    if (code.length < 4) return jsonResponse({ error: "Código inválido." }, 400);

    const { data: pairing, error } = await adminClient
      .from("pairing_codes")
      .select("used_at, screen_id, expires_at")
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[check-pairing-status]", error.message);
      return jsonResponse({ error: error.message }, 400);
    }

    if (!pairing) {
      return jsonResponse({
        found: false,
        paired: false,
        expired: false,
        status: "pending" as const,
        screen_id: null,
        screen_name: null,
      });
    }

    const expiredByTime = pairing.expires_at
      ? new Date(pairing.expires_at as string).getTime() < Date.now()
      : false;
    const used = Boolean(pairing.used_at && pairing.screen_id);
    let paired = used;
    const expired = expiredByTime && !used;

    let status: "pending" | "paired" | "expired";
    if (paired) status = "paired";
    else if (expired) status = "expired";
    else status = "pending";

    let screen_name: string | null = null;
    let screen: ScreenInfo = null;
    if (paired && pairing.screen_id) {
      const { data: screenRow } = await adminClient
        .from("screens")
        .select("id, name, organization_id, unit_id, platform, store_type, orientation")
        .eq("id", pairing.screen_id as string)
        .maybeSingle();
      screen_name = (screenRow?.name as string) ?? null;
      if (screenRow) {
        screen = {
          id: screenRow.id as string,
          name: (screenRow.name as string) ?? null,
          organization_id: (screenRow.organization_id as string) ?? null,
          unit_id: (screenRow.unit_id as string) ?? null,
          platform: (screenRow.platform as string) ?? null,
          store_type: (screenRow.store_type as string) ?? null,
          orientation: (screenRow.orientation as string) ?? null,
        };
      }
    }

    if (!screen && status !== "expired") {
      const fallback = await findScreenByLegacyPairingCode(code);
      if (fallback) {
        screen = fallback;
        screen_name = fallback.name ?? null;
        paired = true;
        status = "paired";

        // Auto-correção idempotente: se o código foi consumido mas não vinculado
        // no registro de pairing_codes, preenchemos para estabilizar o polling da TV.
        if (!pairing.screen_id || !pairing.used_at) {
          await adminClient
            .from("pairing_codes")
            .update({
              screen_id: fallback.id,
              organization_id: fallback.organization_id,
              used_at: pairing.used_at ?? new Date().toISOString(),
            })
            .eq("code", code)
            .is("screen_id", null);
        }
      }
    }

    return jsonResponse({
      found: true,
      paired,
      expired,
      status,
      screen_id: paired ? ((screen?.id ?? pairing.screen_id) as string | null) : null,
      screen_name,
      // Mantém compatibilidade (screen_id/screen_name) e adiciona contexto útil
      // para o player sair do pareamento com mais metadados.
      screen,
      player_config: paired
        ? {
            resolve_playlist_function: "resolve-screen-playlist",
            heartbeat_function: "heartbeat-screen",
            proof_of_play_function: "generate-proof-of-play",
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 400);
  }
});
