(function (global) {
  "use strict";

  var C = global.SIGNIX_TIZEN_CONSTANTS || {};

  function normalizePairingCode(raw) {
    return String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[·•‧]/g, "-")
      .replace(/_/g, "-");
  }

  function mapPairingRpcError(raw) {
    var m = String(raw || "").toLowerCase();
    if (m.indexOf("invalid or expired pairing") !== -1) {
      return "Código não encontrado ou expirado. No painel, use «Gerar código» na tela (código válido por tempo limitado) ou confirme o código mostrado.";
    }
    return raw && raw.length > 0 ? raw : "Falha no pareamento.";
  }

  function inferMediaHint(url, explicit) {
    var hint = String(explicit || "").toLowerCase();
    if (hint === "video" || hint === "html" || hint === "banner" || hint === "image") return hint;
    var lower = String(url || "").toLowerCase();
    if (/\.(mp4|m4v|webm|mov)(\?|$)/.test(lower)) return "video";
    if (/\.(html|htm)(\?|$)/.test(lower)) return "html";
    return "image";
  }

  function toDirectMediaUrl(url, mediaTypeHint) {
    if (url == null) return "";
    var normalizedUrl = String(url).trim();
    if (!normalizedUrl) return "";
    var mediaHint = inferMediaHint(normalizedUrl, mediaTypeHint);

    var isGoogleDrive = /(?:drive|docs)\.google\.com|googleusercontent\.com/.test(normalizedUrl);
    var m1 = normalizedUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
    var m2 = normalizedUrl.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/);
    var m3 = normalizedUrl.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/);
    var m4 = isGoogleDrive ? normalizedUrl.match(/[?&]id=([^&]+)/) : null;
    var driveId = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || (m4 && m4[1]);

    if (driveId) {
      if (mediaHint === "video") {
        return "https://drive.google.com/uc?export=download&id=" + driveId;
      }
      return "https://lh3.googleusercontent.com/d/" + driveId + "=w1600";
    }

    if (normalizedUrl.indexOf("dropbox.com") !== -1) {
      var cleanUrl = normalizedUrl.replace(/[?&](dl|raw)=\d/g, "");
      return cleanUrl + (cleanUrl.indexOf("?") !== -1 ? "&raw=1" : "?raw=1");
    }

    return normalizedUrl;
  }

  function getMediaUrlCandidates() {
    var urls = Array.prototype.slice.call(arguments);
    var mediaTypeHint = null;
    if (urls.length > 0 && urls[0] && typeof urls[0] === "object" && !Array.isArray(urls[0])) {
      mediaTypeHint = urls[0].mediaTypeHint || null;
      urls = urls.slice(1);
    }
    var seen = {};
    var out = [];
    for (var i = 0; i < urls.length; i++) {
      var u = toDirectMediaUrl(urls[i], mediaTypeHint);
      if (u && !seen[u]) {
        seen[u] = true;
        out.push(u);
      }
    }
    return out;
  }

  function applyMediaFallback(img) {
    var sources = JSON.parse(img.dataset.sources || "[]");
    var currentIndex = Number(img.dataset.sourceIndex || "0");
    var nextSource = sources[currentIndex + 1];
    if (!nextSource) {
      img.style.display = "none";
      return;
    }
    img.style.display = "";
    img.dataset.sourceIndex = String(currentIndex + 1);
    img.src = nextSource;
  }

  /**
   * Resposta bruta de POST /functions/v1/pair-screen
   */
  function credentialsFromPairScreen(body) {
    if (!body || !body.screen) {
      throw new Error(mapPairingRpcError("invalid or expired pairing code"));
    }
    var s = body.screen;
    return {
      screenId: s.screen_id,
      organizationId: s.organization_id,
      screenName: s.screen_name || "",
      unitId: s.unit_id != null ? s.unit_id : null,
      platform: s.platform || "tizen",
      fingerprint: null,
      pairedAt: new Date().toISOString(),
    };
  }

  /**
   * Normaliza payload JSON devolvido por resolve_screen_payload (Edge resolve-screen-playlist).
   */
  function internalPayloadFromResolve(rawPayload) {
    if (rawPayload == null) {
      return {
        screen_id: "",
        organization_id: "",
        campaign_id: "",
        playlist_id: "",
        payload_version: "empty",
        valid_until: null,
        priority: null,
        items: [],
      };
    }

    var itemsIn = Array.isArray(rawPayload.items) ? rawPayload.items : [];
    var items = [];
    for (var i = 0; i < itemsIn.length; i++) {
      var it = itemsIn[i];
      if (!it || !it.media_asset_id) continue;
      var mediaType = it.media_type || "image";
      var candidates = getMediaUrlCandidates({ mediaTypeHint: mediaType }, it.media_url, it.thumbnail_url);
      var primary = candidates[0] || "";
      if (!primary && mediaType !== "html") continue;

      var dur = Number(it.duration_seconds);
      if (!dur || dur < 1) dur = C.IMAGE_DEFAULT_DURATION_SEC || 8;

      items.push({
        id: String(it.id || it.media_asset_id),
        media_asset_id: String(it.media_asset_id),
        media_type: mediaType,
        media_url: primary,
        media_url_candidates: candidates,
        thumbnail_url: it.thumbnail_url || null,
        duration_seconds: dur,
        position: Number(it.position != null ? it.position : i),
        transition_type: it.transition_type || null,
        checksum: it.checksum || null,
        metadata: it.metadata && typeof it.metadata === "object" ? it.metadata : {},
      });
    }

    items.sort(function (a, b) {
      return a.position - b.position;
    });

    return {
      screen_id: String(rawPayload.screen_id || ""),
      organization_id: String(rawPayload.organization_id || ""),
      campaign_id: String(rawPayload.campaign_id || ""),
      playlist_id: String(rawPayload.playlist_id || ""),
      payload_version: String(rawPayload.payload_version || ""),
      valid_until: rawPayload.valid_until != null ? rawPayload.valid_until : null,
      priority: rawPayload.priority != null ? rawPayload.priority : null,
      items: items,
    };
  }

  function buildPayloadEtag(payload) {
    if (!payload || !payload.items) return "empty";
    return (
      (payload.campaign_id || "none") +
      ":" +
      payload.items
        .map(function (x) {
          return x.id;
        })
        .join(",")
    );
  }

  function newLocalEventId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  global.signixAdapter = {
    normalizePairingCode: normalizePairingCode,
    mapPairingRpcError: mapPairingRpcError,
    toDirectMediaUrl: toDirectMediaUrl,
    getMediaUrlCandidates: getMediaUrlCandidates,
    applyMediaFallback: applyMediaFallback,
    credentialsFromPairScreen: credentialsFromPairScreen,
    internalPayloadFromResolve: internalPayloadFromResolve,
    buildPayloadEtag: buildPayloadEtag,
    newLocalEventId: newLocalEventId,
  };
})(typeof window !== "undefined" ? window : globalThis);
