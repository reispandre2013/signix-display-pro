(function (global) {
  "use strict";

  var C = global.SIGNIX_TIZEN_CONSTANTS || {};
  var Storage = global.signixStorage || {};
  var Adapter = global.signixAdapter || {};
  var Remote = global.signixRemote || {};

  function $(id) {
    return document.getElementById(id);
  }

  function buildFingerprint() {
    var seed =
      (typeof navigator !== "undefined" ? navigator.userAgent : "") +
      "|" +
      (typeof navigator !== "undefined" ? navigator.language : "") +
      "|" +
      (typeof screen !== "undefined" ? screen.width + "x" + screen.height : "") +
      "|tizen-web";
    var hash = 0;
    for (var i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return "fp-" + Math.abs(hash);
  }

  function readConfig() {
    var cfg = global.SIGNIX_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error(
        "Configure window.SIGNIX_CONFIG no index.html (supabaseUrl e supabaseAnonKey).",
      );
    }
    return {
      supabaseUrl: String(cfg.supabaseUrl).trim(),
      supabaseAnonKey: String(cfg.supabaseAnonKey).trim(),
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

    var stageActivation = $("stage-activation");
    var stagePlayer = $("stage-player");
    var codeInput = $("pairing-code");
    var btnActivate = $("btn-activate");
    var btnReset = $("btn-reset");
    var actError = $("activation-error");
    var actStatus = $("activation-status");
    var videoEl = $("media-video");
    var imgEl = $("media-image");
    var iframeEl = $("media-html");
    var barCounter = $("bar-counter");
    var offlineBanner = $("offline-banner");
    var debugPanel = $("debug-panel");
    var debugPre = $("debug-pre");
    var syncBtn = $("btn-sync");

    var debugVisible = false;

    function showStage(name) {
      if (stageActivation) stageActivation.hidden = name !== "activation";
      if (stagePlayer) stagePlayer.hidden = name === "activation";
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
        if (stage === "activation") {
          showStage("activation");
        } else {
          showStage("player");
        }
        if (stage === "fallback" || stage === "empty") {
          $("fallback-message").hidden = false;
          var fm = $("fallback-text");
          if (fm) {
            fm.textContent =
              status && status.lastError
                ? status.lastError
                : "Sem itens para reproduzir. Aguarde sincronização ou verifique a campanha.";
          }
        } else {
          $("fallback-message").hidden = true;
        }
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

    function runActivationError(msg) {
      if (actError) {
        actError.textContent = msg || "";
        actError.hidden = !msg;
      }
    }

    function runActivationBusy(on) {
      if (btnActivate) btnActivate.disabled = !!on;
      if (actStatus) actStatus.textContent = on ? "A ativar…" : "";
    }

    function afterPairSuccess(creds) {
      Storage.setCredentials(creds);
      runActivationError("");
      showStage("player");
      player.syncPlaylist().catch(function (e) {
        logger.error(e);
      });
    }

    function onActivate() {
      var raw = codeInput ? codeInput.value : "";
      var code = Adapter.normalizePairingCode(raw);
      runActivationError("");
      if (code.length < 8) {
        runActivationError("Introduza o código completo.");
        return;
      }
      runActivationBusy(true);
      var fp = buildFingerprint();
      api
        .pairScreen(code, fp)
        .then(function (res) {
          var creds = Adapter.credentialsFromPairScreen(res);
          creds.fingerprint = fp;
          afterPairSuccess(creds);
        })
        .catch(function (e) {
          runActivationError(e instanceof Error ? e.message : "Falha no pareamento.");
        })
        .finally(function () {
          runActivationBusy(false);
        });
    }

    function onReset() {
      if (!global.confirm("Repor pareamento neste dispositivo?")) return;
      player.reset();
      Storage.clearCredentials();
      Storage.clearCachedPayload();
      showStage("activation");
      runActivationError("");
      if (codeInput) codeInput.value = "";
    }

    if (btnActivate) btnActivate.addEventListener("click", onActivate);
    if (btnReset) btnReset.addEventListener("click", onReset);
    if (syncBtn)
      syncBtn.addEventListener("click", function () {
        player.syncPlaylist().catch(function (e) {
          logger.error(e);
        });
      });

    if (codeInput) {
      codeInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") onActivate();
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
    if (creds0 && creds0.screenId) {
      showStage("player");
      player.syncPlaylist().catch(function (e) {
        logger.error(e);
      });
    } else {
      showStage("activation");
      if (codeInput) {
        try {
          codeInput.focus();
        } catch (e) {
          /* ignore */
        }
      }
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
