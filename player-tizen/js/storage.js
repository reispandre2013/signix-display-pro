(function (global) {
  "use strict";

  var C = global.SIGNIX_TIZEN_CONSTANTS || {};

  function parseJson(raw, fallback) {
    if (raw == null || raw === "") return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function getCredentials() {
    var raw = localStorage.getItem(C.STORAGE_CREDENTIALS || "signix_tizen_credentials");
    return parseJson(raw, null);
  }

  function setCredentials(creds) {
    localStorage.setItem(C.STORAGE_CREDENTIALS || "signix_tizen_credentials", JSON.stringify(creds));
  }

  function clearCredentials() {
    localStorage.removeItem(C.STORAGE_CREDENTIALS || "signix_tizen_credentials");
  }

  function getCachedPayload() {
    var raw = localStorage.getItem(C.STORAGE_PAYLOAD_CACHE || "signix_tizen_payload_cache");
    return parseJson(raw, null);
  }

  function setCachedPayload(payload) {
    localStorage.setItem(C.STORAGE_PAYLOAD_CACHE || "signix_tizen_payload_cache", JSON.stringify(payload));
  }

  function clearCachedPayload() {
    localStorage.removeItem(C.STORAGE_PAYLOAD_CACHE || "signix_tizen_payload_cache");
  }

  function loadLogQueue() {
    var raw = localStorage.getItem(C.STORAGE_LOG_QUEUE || "signix_tizen_log_queue");
    var q = parseJson(raw, []);
    return Array.isArray(q) ? q : [];
  }

  function saveLogQueue(q) {
    var max = C.LOG_QUEUE_MAX || 200;
    while (q.length > max) q.shift();
    localStorage.setItem(C.STORAGE_LOG_QUEUE || "signix_tizen_log_queue", JSON.stringify(q));
  }

  function enqueuePlaybackLog(entry) {
    var q = loadLogQueue();
    q.push(entry);
    saveLogQueue(q);
  }

  function dequeueLogBatch(max) {
    var q = loadLogQueue();
    var n = Math.min(max || 10, q.length);
    var batch = q.splice(0, n);
    saveLogQueue(q);
    return batch;
  }

  global.signixStorage = {
    getCredentials: getCredentials,
    setCredentials: setCredentials,
    clearCredentials: clearCredentials,
    getCachedPayload: getCachedPayload,
    setCachedPayload: setCachedPayload,
    clearCachedPayload: clearCachedPayload,
    enqueuePlaybackLog: enqueuePlaybackLog,
    dequeueLogBatch: dequeueLogBatch,
    loadLogQueue: loadLogQueue,
  };
})(typeof window !== "undefined" ? window : globalThis);
