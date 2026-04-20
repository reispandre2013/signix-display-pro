(function (global) {
  "use strict";

  var Adapter = global.signixAdapter || {};
  var Cache = global.signixCache || {};
  var Storage = global.signixStorage || {};

  function createPlayerController(opts) {
    var api = opts.api;
    var logger = opts.logger;
    var media = opts.media || {};
    var videoEl = media.video;
    var imgEl = media.img;
    var iframeEl = media.iframe;
    var onStage = typeof opts.onStage === "function" ? opts.onStage : function () {};
    var onIndexChange =
      typeof opts.onIndexChange === "function"
        ? opts.onIndexChange
        : function () {};

    var index = 0;
    var payload = null;
    var lastSyncOk = true;
    var lastError = null;
    var fromOfflineCache = false;
    var imageTimer = null;
    var watchdogTimer = null;
    var videoEndedHandler = null;
    var videoErrorHandler = null;

    function items() {
      return payload && Array.isArray(payload.items) ? payload.items : [];
    }

    function clearTimers() {
      if (imageTimer != null) {
        clearTimeout(imageTimer);
        imageTimer = null;
      }
      if (watchdogTimer != null) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
    }

    function hideAllMedia() {
      if (videoEl) {
        videoEl.onended = null;
        videoEl.onerror = null;
        try {
          videoEl.removeAttribute("src");
          videoEl.load();
        } catch (e) {
          /* ignore */
        }
        videoEl.style.display = "none";
      }
      if (imgEl) {
        imgEl.style.display = "none";
        imgEl.removeAttribute("src");
      }
      if (iframeEl) {
        iframeEl.style.display = "none";
        iframeEl.removeAttribute("src");
      }
    }

    function currentItem() {
      var list = items();
      if (!list.length) return null;
      return list[index] || null;
    }

    function getRuntimeStatus() {
      var cur = currentItem();
      return {
        screenId: Storage.getCredentials() ? Storage.getCredentials().screenId : null,
        campaignId: payload ? payload.campaign_id : null,
        playlistId: payload ? payload.playlist_id : null,
        mediaAssetId: cur ? cur.media_asset_id : null,
        index: index,
        total: items().length,
        lastError: lastError,
        fromOfflineCache: fromOfflineCache,
        lastSyncOk: lastSyncOk,
      };
    }

    function finalizePlayback(status, errorMessage) {
      var creds = Storage.getCredentials();
      var cur = currentItem();
      if (!creds || !payload || !cur) return Promise.resolve();

      var started = window.__signixPlaybackStart;
      var eventId = window.__signixPlaybackEventId;
      window.__signixPlaybackStart = null;
      window.__signixPlaybackEventId = null;

      var elapsed = started ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;

      Storage.enqueuePlaybackLog({
        screenId: creds.screenId,
        campaignId: payload.campaign_id,
        playlistId: payload.playlist_id,
        mediaAssetId: cur.media_asset_id,
        durationPlayed: elapsed,
        playbackStatus: status,
        errorMessage: errorMessage || null,
        localEventId: eventId,
      });

      return Promise.resolve();
    }

    function nextItem() {
      var list = items();
      if (!list.length) return;
      index = (index + 1) % list.length;
      onIndexChange(index, list.length);
      playCurrent().catch(function (e) {
        logger.error("[player] next play", e);
      });
    }

    function prevItem() {
      var list = items();
      if (!list.length) return;
      index = (index - 1 + list.length) % list.length;
      onIndexChange(index, list.length);
      playCurrent().catch(function (e) {
        logger.error("[player] prev play", e);
      });
    }

    function scheduleImageAndWatchdog(item) {
      var C = global.SIGNIX_TIZEN_CONSTANTS || {};
      var durSec = Math.max(C.IMAGE_MIN_DURATION_SEC || 4, item.duration_seconds || C.IMAGE_DEFAULT_DURATION_SEC || 8);
      var durationMs = durSec * 1000;
      clearTimers();

      imageTimer = setTimeout(function () {
        finalizePlayback("ended", null).catch(function () {});
        nextItem();
      }, durationMs);

      var watchdogMs = Math.max(durationMs * 2, C.WATCHDOG_MIN_MS || 15000);
      watchdogTimer = setTimeout(function () {
        finalizePlayback("failed", "Watchdog de reprodução").catch(function () {});
        nextItem();
      }, watchdogMs);
    }

    function playCurrent() {
      clearTimers();
      hideAllMedia();

      var credsNow = Storage.getCredentials();
      if (!credsNow) {
        onStage("pairing", getRuntimeStatus());
        return Promise.resolve();
      }

      var list = items();
      if (!list.length) {
        onStage("empty", getRuntimeStatus());
        return Promise.resolve();
      }

      var item = list[index];
      if (!item) {
        onStage("empty", getRuntimeStatus());
        return Promise.resolve();
      }

      onStage("playing", getRuntimeStatus());

      var eventId = Adapter.newLocalEventId();
      window.__signixPlaybackStart = Date.now();
      window.__signixPlaybackEventId = eventId;

      Storage.enqueuePlaybackLog({
        screenId: credsNow.screenId,
        campaignId: payload.campaign_id,
        playlistId: payload.playlist_id,
        mediaAssetId: item.media_asset_id,
        durationPlayed: null,
        playbackStatus: "started",
        localEventId: eventId,
      });

      var type = item.media_type || "image";

      if (type === "html") {
        if (iframeEl) {
          iframeEl.style.display = "block";
          iframeEl.src = item.media_url || "";
          iframeEl.setAttribute(
            "sandbox",
            "allow-scripts allow-same-origin allow-forms allow-popups",
          );
          scheduleImageAndWatchdog(item);
        }
        return Promise.resolve();
      }

      if (type === "video") {
        if (!videoEl) return Promise.resolve();
        return Cache.resolvePlayableUrl(item.media_url).then(function (url) {
          videoEl.style.display = "block";
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.setAttribute("playsinline", "");
          videoEl.src = url || item.media_url;

          if (videoEndedHandler) videoEl.removeEventListener("ended", videoEndedHandler);
          if (videoErrorHandler) videoEl.removeEventListener("error", videoErrorHandler);

          videoEndedHandler = function () {
            finalizePlayback("ended", null).catch(function () {});
            nextItem();
          };
          videoErrorHandler = function () {
            finalizePlayback("failed", "Erro no elemento video").catch(function () {});
            nextItem();
          };
          videoEl.addEventListener("ended", videoEndedHandler);
          videoEl.addEventListener("error", videoErrorHandler);

          var playPromise = videoEl.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
              finalizePlayback("failed", "play() rejeitado").catch(function () {});
              nextItem();
            });
          }

          var C2 = global.SIGNIX_TIZEN_CONSTANTS || {};
          var durSec = Math.max(C2.IMAGE_MIN_DURATION_SEC || 4, item.duration_seconds || 300);
          watchdogTimer = setTimeout(function () {
            finalizePlayback("failed", "Watchdog vídeo").catch(function () {});
            nextItem();
          }, Math.max(durSec * 1000 * 2, 60000));
        });
      }

      /* image / banner */
      if (imgEl) {
        imgEl.style.display = "block";
        var cand =
          item.media_url_candidates ||
          Adapter.getMediaUrlCandidates({ mediaTypeHint: "image" }, item.media_url, item.thumbnail_url);
        imgEl.src = cand[0] || "";
        imgEl.dataset.sources = JSON.stringify(cand);
        imgEl.dataset.sourceIndex = "0";
        imgEl.onerror = function () {
          Adapter.applyMediaFallback(imgEl);
        };
        scheduleImageAndWatchdog(item);
      }

      return Promise.resolve();
    }

    function syncPlaylist() {
      var creds = Storage.getCredentials();
      if (!creds) {
        onStage("pairing", getRuntimeStatus());
        return Promise.resolve();
      }

      fromOfflineCache = false;
      lastSyncOk = true;
      lastError = null;

      function applyInternal(internal, offlineFlag) {
        payload = internal;
        fromOfflineCache = !!offlineFlag;
        if (!items().length) {
          lastError = offlineFlag ? "Sem conteúdo em cache." : "Nenhuma campanha ou playlist para esta tela.";
          onStage("fallback", getRuntimeStatus());
          return;
        }
        index = Math.min(index, items().length - 1);
        onStage("playing", getRuntimeStatus());
        return playCurrent();
      }

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        var cached = Storage.getCachedPayload();
        if (cached && cached.items && cached.items.length) {
          logger.warn("[player] Offline — a usar cache local.");
          lastSyncOk = false;
          return Promise.resolve(applyInternal(cached, true));
        }
        lastSyncOk = false;
        lastError = "Sem rede e sem cache.";
        onStage("fallback", getRuntimeStatus());
        return Promise.resolve();
      }

      return api
        .resolveScreenPayload(creds.screenId)
        .then(function (raw) {
          var internal = Adapter.internalPayloadFromResolve(raw);
          if (internal.items.length) {
            Storage.setCachedPayload(internal);
          } else {
            var cachedLive = Storage.getCachedPayload();
            if (cachedLive && cachedLive.items && cachedLive.items.length) {
              logger.warn("[player] Playlist vazia no servidor — a usar último cache.");
              return applyInternal(cachedLive, true);
            }
          }
          return applyInternal(internal, false);
        })
        .catch(function (e) {
          logger.error("[player] sync falhou", e);
          lastSyncOk = false;
          lastError = e instanceof Error ? e.message : String(e);
          var cached = Storage.getCachedPayload();
          if (cached && cached.items && cached.items.length) {
            logger.warn("[player] fallback para cache após erro de sync.");
            return applyInternal(cached, true);
          }
          onStage("fallback", getRuntimeStatus());
        });
    }

    function reset() {
      clearTimers();
      hideAllMedia();
      index = 0;
      payload = null;
    }

    return {
      syncPlaylist: syncPlaylist,
      playCurrent: playCurrent,
      nextItem: nextItem,
      prevItem: prevItem,
      getRuntimeStatus: getRuntimeStatus,
      reset: reset,
      setIndex: function (i) {
        var list = items();
        if (!list.length) return;
        index = Math.max(0, Math.min(i, list.length - 1));
        onIndexChange(index, list.length);
      },
    };
  }

  global.signixCreatePlayerController = createPlayerController;
})(typeof window !== "undefined" ? window : globalThis);
