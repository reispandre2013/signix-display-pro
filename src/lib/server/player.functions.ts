import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Endpoint público usado pelo /player (TV) para buscar as mídias e campanhas
 * vinculadas a uma tela pareada. Não exige sessão autenticada — a TV se
 * identifica apenas pelo screen_id salvo no localStorage durante o pareamento.
 *
 * Usa supabaseAdmin para contornar RLS de forma segura: só retorna conteúdo
 * da organização da tela informada.
 */
export const getScreenContent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
    const { screen_id } = input as Record<string, unknown>;
    if (typeof screen_id !== "string" || screen_id.length < 8)
      throw new Error("screen_id inválido.");
    return { screen_id };
  })
  .handler(async ({ data }) => {
    // 1. Resolve a organização da tela
    const { data: screen, error: screenErr } = await supabaseAdmin
      .from("screens")
      .select("id, name, organization_id")
      .eq("id", data.screen_id)
      .maybeSingle();

    if (screenErr) {
      console.error("[getScreenContent] screen error:", screenErr.message);
      throw new Error("Falha ao localizar a tela.");
    }
    if (!screen) {
      return { screen: null, media: [], campaign: null };
    }

    const orgId = screen.organization_id as string;

    // 2. Busca mídias ativas da org
    const { data: media, error: mediaErr } = await supabaseAdmin
      .from("media_assets")
      .select("id, name, file_type, public_url, thumbnail_url, duration_seconds, status")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50);

    if (mediaErr) {
      console.error("[getScreenContent] media error:", mediaErr.message);
    }

    // 3. Campanha ativa (ou agendada) mais recente
    const { data: campaigns } = await supabaseAdmin
      .from("campaigns")
      .select("id, name, description, status, start_at, end_at")
      .eq("organization_id", orgId)
      .in("status", ["active", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(1);

    return {
      screen: { id: screen.id, name: screen.name },
      media: (media ?? []).filter((m) => m.public_url),
      campaign: campaigns?.[0] ?? null,
    };
  });
