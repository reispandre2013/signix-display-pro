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
  platform?: string | null;
};

function normalizePlatform(p: string | null | undefined): "android" | "tizen" {
  const v = (p ?? "").toLowerCase().trim();
  if (v === "tizen") return "tizen";
  return "android";
}

function randomChunk() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function normalizePairingCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
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
    const body = await readJson<Body>(req).catch(() => ({} as Body));
    const platform = normalizePlatform(body.platform ?? null);

    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = `${randomChunk()}-${randomChunk()}`;
      const normalized = normalizePairingCode(code);
      const { data: inserted, error } = await adminClient
        .from("pairing_codes")
        .insert({ code: normalized, expires_at, player_platform: platform })
        .select("code, expires_at")
        .single();

      if (!error && inserted) {
        return jsonResponse({
          code: inserted.code as string,
          expires_at: inserted.expires_at as string,
          platform,
        });
      }
      if (error && !String(error.message).toLowerCase().includes("duplicate")) {
        return jsonResponse({ error: error.message }, 400);
      }
    }
    return jsonResponse({ error: "Não foi possível gerar código único." }, 500);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 400);
  }
});
