(function (global) {
  "use strict";

  var C = global.SIGNIX_TIZEN_CONSTANTS || {};
  var Adapter = global.signixAdapter || {};

  function buildFunctionUrl(supabaseUrl, name) {
    var base = String(supabaseUrl || "").replace(/\/$/, "");
    if (!base) throw new Error("SUPABASE_URL não configurada (window.SIGNIX_CONFIG.supabaseUrl).");
    return base + "/functions/v1/" + name;
  }

  function createApi(config) {
    var supabaseUrl = config.supabaseUrl;
    var anon = config.supabaseAnonKey;
    if (!anon) throw new Error("Chave anónima Supabase em falta (window.SIGNIX_CONFIG.supabaseAnonKey).");

    function postFunction(name, payload) {
      return fetch(buildFunctionUrl(supabaseUrl, name), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: "Bearer " + anon,
        },
        body: JSON.stringify(payload),
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || (data && data.error)) {
            throw new Error((data && data.error) || "Falha na função " + name);
          }
          return data;
        });
      });
    }

    /** Fluxo correcto: TV pede código ao backend (sem digitar no painel). */
    function createAnonymousPairingCode(platform) {
      return postFunction("create-pairing-code", {
        platform: platform === "tizen" ? "tizen" : "android",
      });
    }

    function checkAnonymousPairingStatus(code) {
      var c = Adapter.normalizePairingCode(code);
      if (c.length < 4) {
        return Promise.reject(new Error("Código inválido."));
      }
      return postFunction("check-pairing-status", { code: c });
    }

    /** Fluxo legado (painel gera código na tela — prepare_screen_pairing). Mantido por compatibilidade. */
    function pairScreen(pairingCode, fingerprint) {
      var code = Adapter.normalizePairingCode(pairingCode);
      if (code.length < 8) {
        return Promise.reject(new Error("Introduza o código completo (ex.: ABCD-EFGH)."));
      }
      return postFunction("pair-screen", {
        pairingCode: code,
        deviceFingerprint: fingerprint,
        platform: "tizen",
        osName: typeof navigator !== "undefined" ? navigator.userAgent : "tizen-tv",
        playerVersion: C.PLAYER_VERSION_LABEL || "signix-tizen-player@1.0.0",
      }).catch(function (e) {
        var raw = e instanceof Error ? e.message : "";
        throw new Error(Adapter.mapPairingRpcError ? Adapter.mapPairingRpcError(raw) : raw);
      });
    }

    function resolveScreenPayload(screenId) {
      return postFunction("resolve-screen-playlist", { screenId: screenId }).then(function (data) {
        return data && data.payload != null ? data.payload : null;
      });
    }

    function sendHeartbeat(params) {
      return postFunction("heartbeat-screen", {
        screenId: params.screenId,
        appVersion: C.PLAYER_VERSION_LABEL,
        networkStatus: params.networkStatus || "unknown",
        deviceInfo: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          language: typeof navigator !== "undefined" ? navigator.language : "",
          platform: "tizen",
        },
        isOk: params.isOk !== false,
        errorMessage: params.errorMessage != null ? params.errorMessage : null,
      });
    }

    function uuidOrNull(v) {
      if (v == null || v === "") return null;
      return v;
    }

    function sendPlaybackLog(log) {
      return postFunction("generate-proof-of-play", {
        screenId: log.screenId,
        campaignId: uuidOrNull(log.campaignId),
        playlistId: uuidOrNull(log.playlistId),
        mediaAssetId: uuidOrNull(log.mediaAssetId),
        durationPlayed: log.durationPlayed != null ? log.durationPlayed : null,
        playbackStatus: log.playbackStatus || "ok",
        localEventId: log.localEventId || null,
      });
    }

    return {
      createAnonymousPairingCode: createAnonymousPairingCode,
      checkAnonymousPairingStatus: checkAnonymousPairingStatus,
      pairScreen: pairScreen,
      resolveScreenPayload: resolveScreenPayload,
      sendHeartbeat: sendHeartbeat,
      sendPlaybackLog: sendPlaybackLog,
    };
  }

  global.signixCreateApi = createApi;
})(typeof window !== "undefined" ? window : globalThis);
