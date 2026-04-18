(function (global) {
  "use strict";

  var C = global.SIGNIX_TIZEN_CONSTANTS || {};

  function loadRing() {
    try {
      var raw = localStorage.getItem(C.STORAGE_LOGGER_BUFFER || "signix_tizen_logger_buffer");
      if (!raw) return [];
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function saveRing(ring) {
    try {
      var max = C.LOGGER_RING_MAX || 400;
      while (ring.length > max) ring.shift();
      localStorage.setItem(C.STORAGE_LOGGER_BUFFER || "signix_tizen_logger_buffer", JSON.stringify(ring));
    } catch (e) {
      /* quota */
    }
  }

  function pushRing(level, args) {
    var ring = loadRing();
    var msg = args
      .map(function (x) {
        if (typeof x === "string") return x;
        try {
          return JSON.stringify(x);
        } catch (e) {
          return String(x);
        }
      })
      .join(" ");
    ring.push({ t: new Date().toISOString(), level: level, message: msg });
    saveRing(ring);
  }

  function createLogger(debugMode) {
    var debug = !!debugMode;

    function log(level, fn, argsArr) {
      try {
        fn.apply(console, argsArr);
      } catch (e) {
        /* ignore */
      }
      if (level === "debug" && !debug) return;
      pushRing(level, argsArr);
    }

    return {
      setDebug: function (on) {
        debug = !!on;
      },
      debug: function () {
        log("debug", console.debug || console.log, Array.prototype.slice.call(arguments));
      },
      info: function () {
        log("info", console.info || console.log, Array.prototype.slice.call(arguments));
      },
      warn: function () {
        log("warn", console.warn || console.log, Array.prototype.slice.call(arguments));
      },
      error: function () {
        log("error", console.error || console.log, Array.prototype.slice.call(arguments));
      },
      getRing: loadRing,
      clearRing: function () {
        try {
          localStorage.removeItem(C.STORAGE_LOGGER_BUFFER || "signix_tizen_logger_buffer");
        } catch (e) {
          /* ignore */
        }
      },
    };
  }

  global.signixCreateLogger = createLogger;
})(typeof window !== "undefined" ? window : globalThis);
