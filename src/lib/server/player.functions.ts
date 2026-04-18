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

/**
 * Heartbeat público chamado a cada ~30s pelo /player para manter a tela como
 * online no painel. Atualiza last_seen_at, is_online=true, device_status=online
 * e (opcionalmente) plataforma, versão do player e resolução.
 *
 * Também atualiza current_campaign_id se informado, para refletir no monitoramento.
 */
export const heartbeatScreen = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (typeof input !== "object" || input === null) throw new Error("Payload inválido.");
    const obj = input as Record<string, unknown>;
    const screen_id = obj.screen_id;
    if (typeof screen_id !== "string" || screen_id.length < 8)
      throw new Error("screen_id inválido.");
    return {
      screen_id,
      platform: typeof obj.platform === "string" ? obj.platform.slice(0, 64) : null,
      player_version:
        typeof obj.player_version === "string" ? obj.player_version.slice(0, 32) : null,
      resolution: typeof obj.resolution === "string" ? obj.resolution.slice(0, 32) : null,
      current_campaign_id:
        typeof obj.current_campaign_id === "string" ? obj.current_campaign_id : null,
    };
  })
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      last_seen_at: now,
      last_sync_at: now,
      is_online: true,
      device_status: "online",
    };
    if (data.platform) update.platform = data.platform;
    if (data.player_version) update.player_version = data.player_version;
    if (data.resolution) update.resolution = data.resolution;
    if (data.current_campaign_id) update.current_campaign_id = data.current_campaign_id;

    const { error } = await supabaseAdmin
      .from("screens")
      .update(update)
      .eq("id", data.screen_id);

    if (error) {
      console.error("[heartbeatScreen] update error:", error.message);
      // Tenta sem colunas opcionais que talvez não existam no schema
      const fallback = {
        last_seen_at: now,
        is_online: true,
        device_status: "online",
      };
      const { error: err2 } = await supabaseAdmin
        .from("screens")
        .update(fallback)
        .eq("id", data.screen_id);
      if (err2) {
        console.error("[heartbeatScreen] fallback error:", err2.message);
        return { ok: false, error: err2.message };
      }
    }

    return { ok: true, ts: now };
  });

/**
 * Marca telas como offline quando ficam mais de 2 minutos sem ping.
 * Pode ser chamado pelo painel de monitoramento ao carregar/sincronizar
 * para refletir o estado real sem depender de cron.
 */
export const reconcileScreenStatuses = createServerFn({ method: "POST" })
  .handler(async () => {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { error, count } = await supabaseAdmin
      .from("screens")
      .update({ is_online: false, device_status: "offline" }, { count: "exact" })
      .lt("last_seen_at", cutoff)
      .eq("is_online", true);

    if (error) {
      console.error("[reconcileScreenStatuses] error:", error.message);
      return { ok: false, marked_offline: 0 };
    }
    return { ok: true, marked_offline: count ?? 0 };
  });
