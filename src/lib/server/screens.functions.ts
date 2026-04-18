import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

type Orientation = "landscape" | "portrait";

interface ClaimInput {
  code: string;
  name: string;
  unit_id: string | null;
  orientation: Orientation;
}

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function validate(input: unknown): ClaimInput {
  if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
  const { code, name, unit_id, orientation } = input as Record<string, unknown>;
  if (typeof code !== "string" || normalizeCode(code).length < 6)
    throw new Error("Código de pareamento inválido.");
  if (typeof name !== "string" || name.trim().length < 2)
    throw new Error("Informe um nome para a tela.");
  if (orientation !== "landscape" && orientation !== "portrait")
    throw new Error("Orientação inválida.");
  return {
    code: normalizeCode(code),
    name: name.trim(),
    unit_id: typeof unit_id === "string" && unit_id.length > 0 ? unit_id : null,
    orientation,
  };
}

/**
 * Vincula um código de pareamento (gerado pelo player anônimo) a uma nova
 * Screen criada na organização do Admin chamador.
 *
 * Fluxo:
 *  1. Valida JWT do caller, garante que é admin_master ou gestor.
 *  2. Procura o código em pairing_codes (sem org, dentro da validade).
 *  3. Cria a screen na org do caller.
 *  4. Marca o código como usado e vincula ao screen_id + organization_id.
 *  5. Player detecta used_at via polling e entra em modo "pareado".
 */
export const claimPairingCode = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const authHeader = getRequestHeader("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Não autenticado.");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Sessão inválida.");
    const callerAuthId = userData.user.id;

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role, organization_id")
      .eq("auth_user_id", callerAuthId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile) throw new Error("Perfil não encontrado.");
    if (profile.role !== "admin_master" && profile.role !== "gestor")
      throw new Error("Sem permissão para parear telas.");

    const orgId = profile.organization_id as string;

    // Busca o código (pode estar anônimo, sem organization_id)
    const { data: pairing, error: pairingErr } = await supabaseAdmin
      .from("pairing_codes")
      .select("id, code, used_at, expires_at, screen_id")
      .eq("code", data.code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pairingErr) throw new Error(pairingErr.message);
    if (!pairing) throw new Error("Código não encontrado. Verifique se a TV ainda exibe este código.");
    if (pairing.used_at || pairing.screen_id)
      throw new Error("Este código já foi utilizado.");
    if (pairing.expires_at && new Date(pairing.expires_at).getTime() < Date.now())
      throw new Error("Código expirado. Gere um novo na TV.");

    // Cria a screen
    const { data: screen, error: screenErr } = await supabaseAdmin
      .from("screens")
      .insert({
        organization_id: orgId,
        unit_id: data.unit_id,
        name: data.name,
        orientation: data.orientation,
        pairing_code: data.code,
        device_status: "offline",
        is_online: false,
      })
      .select("id, name")
      .single();
    if (screenErr) throw new Error(screenErr.message);

    // Marca código como usado e vincula
    const { error: updErr } = await supabaseAdmin
      .from("pairing_codes")
      .update({
        used_at: new Date().toISOString(),
        screen_id: screen.id,
        organization_id: orgId,
      })
      .eq("id", pairing.id);
    if (updErr) {
      // rollback da screen para não deixar lixo
      await supabaseAdmin.from("screens").delete().eq("id", screen.id);
      throw new Error(updErr.message);
    }

    return { ok: true, screen_id: screen.id, screen_name: screen.name };
  });
