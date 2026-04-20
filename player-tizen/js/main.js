(function (global) {
  "use strict";

  var C = global.SIGNIX_TIZEN_CONSTANTS || {};
  var Storage = global.signixStorage || {};
  var Adapter = global.signixAdapter || {};
  var Remote = global.signixRemote || {};

  function $(id) {
    return document.getElementById(id);
  }

  function readConfig() {
    var cfg = global.SIGNIX_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error(
        "Configure window.SIGNIX_CONFIG no index.html (supabaseUrl e supabaseAnonKey).",
      );
    }
    var supabaseUrl = String(cfg.supabaseUrl).trim();
    var supabaseAnonKey = String(cfg.supabaseAnonKey).trim();
    if (supabaseUrl.indexOf("SEU_PROJETO") !== -1 || supabaseAnonKey.indexOf("COLE_AQUI") !== -1) {
      throw new Error(
        "Substitua em index.html os valores reais de supabaseUrl e supabaseAnonKey (Project Settings → API no Supabase). Os placeholders provocam «Failed to fetch» na TV.",
      );
    }
    return {
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseAnonKey,
      debugMode: !!cfg.debugMode,
    };
  }

  function setNetBadge() {
    var el = $("net-badge");
    if (!el) return;
    var online = typeof navigator !== "undefined" ? navigator.onLine : true;
    el.textContent = online ? "Online" : "Offline";
    el.classList.toggle("is-offline", !online);
  }

  /** Instalações antigas só tinham screenId (resolve/heartbeat bastam). */
  function hasPlaybackCredentials(creds) {
    return !!(creds && creds.screenId);
  }

  function showStage(name) {
    var pairing = $("stage-pairing");
    var player = $("stage-player");
    if (pairing) pairing.hidden = name !== "pairing";
    if (player) player.hidden = name !== "player";
  }

  function boot() {
    var config;
    try {
      config = readConfig();
    } catch (e) {
      document.body.innerHTML =
        '<div class="fatal">' +
        (e instanceof Error ? e.message : "Config em falta.") +
        "</div>";
      return;
    }

    var logger = global.signixCreateLogger(config.debugMode);
    var api;
    try {
      api = global.signixCreateApi(config);
    } catch (e) {
      logger.error(e);
      document.body.innerHTML =
        '<div class="fatal">API: ' +
        (e instanceof Error ? e.message : e) +
        "</div>";
      return;
    }

    var stagePairing = $("stage-pairing");
    var stagePlayer = $("stage-player");
    var pairingCodeDisplay = $("pairing-code-display");
    var pairingExpires = $("pairing-expires");
    var pairingStatusEl = $("pairing-status");
    var pairingError = $("pairing-error");
    var btnNewPairingCode = $("btn-new-pairing-code");
    var videoEl = $("media-video");
    var imgEl = $("media-image");
    var iframeEl = $("media-html");
    var barCounter = $("bar-counter");
    var offlineBanner = $("offline-banner");
    var fallbackMessageEl = $("fallback-message");
    var debugPanel = $("debug-panel");
    var debugPre = $("debug-pre");
    var syncBtn = $("btn-sync");
    var btnReset = $("btn-reset");

    var debugVisible = false;
    var pollTimer = null;
    var autoRenewTimer = null;
    var currentPairingCode = null;

    function clearPoll() {
      if (pollTimer != null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function clearAutoRenew() {
      if (autoRenewTimer != null) {
        clearTimeout(autoRenewTimer);
        autoRenewTimer = null;
      }
    }

    function runPairingError(msg) {
      if (!pairingError) return;
      pairingError.textContent = msg || "";
      pairingError.hidden = !msg;
    }

    function renderCodeVisual(rawCode) {
      if (!pairingCodeDisplay || !rawCode) return;
      pairingCodeDisplay.innerHTML = "";
      var s = String(rawCode);
      for (var i = 0; i < s.length; i += 1) {
        var ch = s.charAt(i);
        var span = document.createElement("span");
        if (ch === "-") {
          span.className = "pairing-sep";
          span.textContent = "·";
        } else {
          span.className = "pairing-char";
          span.textContent = ch;
        }
        pairingCodeDisplay.appendChild(span);
      }
    }

    function updatePairingStatus(res) {
      if (!pairingStatusEl) return;
      if (!res) {
        pairingStatusEl.textContent = "";
        return;
      }
      if (res.status === "paired") {
        pairingStatusEl.textContent = "Pareamento concluído. A iniciar…";
        return;
      }
      if (res.status === "expired") {
        pairingStatusEl.textContent = "Código expirado. Gerando novo código...";
        return;
      }
      pairingStatusEl.textContent = "Aguardando pareamento...";
    }

    function updateDebug() {
      if (!debugPre || !debugVisible) return;
      var ring = logger.getRing().slice(-80);
      var creds = Storage.getCredentials();
      debugPre.textContent = JSON.stringify(
        {
          creds: creds
            ? {
                screenId: creds.screenId,
                pairingCode: creds.pairingCode ? "***" : null,
                screenName: creds.screenName,
                pairedAt: creds.pairedAt,
              }
            : null,
          logRing: ring,
        },
        null,
        2,
      );
    }

    function updateFallbackOverlay(stage, status) {
      if (!fallbackMessageEl) return;
      var total = status && typeof status.total === "number" ? status.total : 0;
      var hasContent = total > 0;
      var shouldShow = (stage === "fallback" || stage === "empty") && !hasContent;
      fallbackMessageEl.hidden = !shouldShow;

      if (!shouldShow) return;
      var fm = $("fallback-text");
      if (fm) {
        fm.textContent =
          status && status.lastError
            ? status.lastError
            : "Sem itens para reproduzir. Aguarde sincronização ou verifique a campanha.";
      }
    }

    var player = global.signixCreatePlayerController({
      api: api,
      logger: logger,
      media: { video: videoEl, img: imgEl, iframe: iframeEl },
      onStage: function (stage, status) {
        logger.info("[stage]", stage, status);
        if (offlineBanner) {
          var show =
            status &&
            (status.fromOfflineCache || (typeof navigator !== "undefined" && !navigator.onLine));
          offlineBanner.hidden = !show;
        }
        if (barCounter && status) {
          barCounter.textContent =
            status.total > 0 ? status.index + 1 + " / " + status.total : "—";
        }
        if (stage === "pairing") {
          showStage("pairing");
        } else {
          showStage("player");
        }
        updateFallbackOverlay(stage, status);
        updateDebug();
      },
      onIndexChange: function (idx, total) {
        if (barCounter) barCounter.textContent = total > 0 ? idx + 1 + " / " + total : "—";
        updateDebug();
      },
    });

    function flushLogQueue() {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      var creds = Storage.getCredentials();
      if (!creds) return;
      var batch = Storage.dequeueLogBatch(12);
      if (!batch.length) return;
      var chain = Promise.resolve();
      batch.forEach(function (entry) {
        chain = chain.then(function () {
          return api
            .sendPlaybackLog({
              screenId: entry.screenId,
              campaignId: entry.campaignId,
              playlistId: entry.playlistId,
              mediaAssetId: entry.mediaAssetId,
              durationPlayed: entry.durationPlayed,
              playbackStatus: entry.playbackStatus,
              localEventId: entry.localEventId,
            })
            .catch(function (e) {
              Storage.enqueuePlaybackLog(entry);
              logger.warn("[logs] re-queue", e);
            });
        });
      });
      return chain;
    }

    function sendHeartbeat() {
      var creds = Storage.getCredentials();
      if (!creds) return;
      var st = player.getRuntimeStatus();
      var online = typeof navigator !== "undefined" ? navigator.onLine : true;
      api
        .sendHeartbeat({
          screenId: creds.screenId,
          isOk: st.lastSyncOk !== false && !st.lastError,
          errorMessage: st.lastError || null,
          networkStatus: online ? "online" : "offline",
        })
        .catch(function (e) {
          logger.warn("[heartbeat]", e);
        });
    }

    function afterPairSuccess(creds) {
      clearAutoRenew();
      Storage.setCredentials(creds);
      runPairingError("");
      showStage("player");
      player.syncPlaylist().catch(function (e) {
        logger.error(e);
      });
    }

    function pollOnce() {
      if (!currentPairingCode) return;
      api
        .checkAnonymousPairingStatus(currentPairingCode)
        .then(function (res) {
          updatePairingStatus(res);
          if (res.status === "expired") {
            clearPoll();
            runPairingError("Este código expirou. Gerando novo automaticamente...");
            clearAutoRenew();
            autoRenewTimer = setTimeout(startPairingFlow, 1000);
            return;
          }
          if (res.paired && res.screen_id) {
            clearPoll();
            var normalized = Adapter.normalizePairingCode(currentPairingCode);
            afterPairSuccess({
              screenId: res.screen_id,
              pairingCode: normalized,
              screenName: res.screen_name || "",
              deviceId: res.screen_id,
              organizationId: "",
              pairedAt: new Date().toISOString(),
            });
          }
        })
        .catch(function (e) {
          logger.warn("[pairing poll]", e);
        });
    }

    function startPairingFlow() {
      clearPoll();
      clearAutoRenew();
      currentPairingCode = null;
      showStage("pairing");
      runPairingError("");
      updatePairingStatus(null);
      if (pairingCodeDisplay) pairingCodeDisplay.innerHTML = "";
      if (pairingExpires) pairingExpires.textContent = "";
      if (pairingStatusEl) pairingStatusEl.textContent = "Aguardando pareamento...";

      api
        .createAnonymousPairingCode("tizen")
        .then(function (res) {
          var raw = res && res.code ? String(res.code) : "";
          if (!raw) throw new Error("Resposta inválida do servidor.");
          currentPairingCode = Adapter.normalizePairingCode(raw);
          renderCodeVisual(raw.trim().toUpperCase());
          if (pairingExpires && res.expires_at) {
            try {
              var d = new Date(res.expires_at);
              pairingExpires.textContent =
                "Válido até " + d.toLocaleString() + " (renove se expirar).";
            } catch (e) {
              pairingExpires.textContent = "";
            }
          }
          updatePairingStatus({ status: "pending" });
          pollOnce();
          pollTimer = setInterval(pollOnce, C.PAIRING_POLL_MS || 4000);
        })
        .catch(function (e) {
          logger.error("[pairing create]", e);
          runPairingError(e instanceof Error ? e.message : "Falha ao gerar código.");
          if (pairingStatusEl) pairingStatusEl.textContent = "";
        });
    }

    function onReset() {
      if (!global.confirm("Repor pareamento neste dispositivo?")) return;
      clearPoll();
      clearAutoRenew();
      player.reset();
      Storage.clearCredentials();
      Storage.clearCachedPayload();
      startPairingFlow();
    }

    if (btnNewPairingCode) {
      btnNewPairingCode.addEventListener("click", function () {
        startPairingFlow();
      });
    }
    if (btnReset) btnReset.addEventListener("click", onReset);
    if (syncBtn) {
      syncBtn.addEventListener("click", function () {
        player.syncPlaylist().catch(function (e) {
          logger.error(e);
        });
      });
    }

    global.setInterval(sendHeartbeat, C.HEARTBEAT_MS || 60000);
    global.setInterval(function () {
      var creds = Storage.getCredentials();
      if (creds) {
        player.syncPlaylist().catch(function (e) {
          logger.warn("[sync]", e);
        });
      }
    }, C.SYNC_MS || 90000);
    global.setInterval(function () {
      flushLogQueue().catch(function () {});
    }, C.LOG_FLUSH_MS || 15000);

    global.addEventListener("online", function () {
      setNetBadge();
      flushLogQueue().catch(function () {});
      if (Storage.getCredentials()) player.syncPlaylist().catch(function () {});
    });
    global.addEventListener("offline", setNetBadge);
    setNetBadge();

    Remote.installRemoteControl({
      onLeft: function () {
        if (!stagePlayer || stagePlayer.hidden) return;
        player.prevItem();
      },
      onRight: function () {
        if (!stagePlayer || stagePlayer.hidden) return;
        player.nextItem();
      },
      onEnter: function () {
        if (stagePairing && !stagePairing.hidden) {
          pollOnce();
          return;
        }
        if (!Storage.getCredentials()) return;
        player.syncPlaylist().catch(function () {});
      },
      onUp: function () {
        debugVisible = true;
        if (debugPanel) debugPanel.hidden = false;
        logger.setDebug(true);
        updateDebug();
      },
      onDown: function () {
        debugVisible = false;
        if (debugPanel) debugPanel.hidden = true;
      },
      onBack: function () {
        if (debugVisible) {
          debugVisible = false;
          if (debugPanel) debugPanel.hidden = true;
          return;
        }
        Remote.tryExitApplication();
      },
    });

    var creds0 = Storage.getCredentials();
    if (hasPlaybackCredentials(creds0)) {
      showStage("player");
      player.syncPlaylist().catch(function (e) {
        logger.error(e);
      });
    } else {
      startPairingFlow();
    }

    flushLogQueue().catch(function () {});
    sendHeartbeat();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
