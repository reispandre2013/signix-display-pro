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
    const paired = used;
    const expired = expiredByTime && !used;

    let status: "pending" | "paired" | "expired";
    if (paired) status = "paired";
    else if (expired) status = "expired";
    else status = "pending";

    let screen_name: string | null = null;
    if (paired && pairing.screen_id) {
      const { data: screen } = await adminClient
        .from("screens")
        .select("name")
        .eq("id", pairing.screen_id as string)
        .maybeSingle();
      screen_name = (screen?.name as string) ?? null;
    }

    return jsonResponse({
      found: true,
      paired,
      expired,
      status,
      screen_id: paired ? (pairing.screen_id as string) : null,
      screen_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 400);
  }
});
