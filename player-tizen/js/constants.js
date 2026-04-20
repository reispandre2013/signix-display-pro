(function (global) {
  "use strict";

  global.SIGNIX_TIZEN_CONSTANTS = {
    PLAYER_VERSION_LABEL: "signix-tizen-player@1.0.10",
    STORAGE_CREDENTIALS: "signix_tizen_credentials",
    STORAGE_PAYLOAD_CACHE: "signix_tizen_payload_cache",
    STORAGE_LOG_QUEUE: "signix_tizen_log_queue",
    STORAGE_LOGGER_BUFFER: "signix_tizen_logger_buffer",
    HEARTBEAT_MS: 60_000,
    SYNC_MS: 90_000,
    LOG_FLUSH_MS: 15_000,
    /** Polling do pareamento (TV mostra código; painel confirma). */
    PAIRING_POLL_MS: 5000,
    IMAGE_MIN_DURATION_SEC: 4,
    IMAGE_DEFAULT_DURATION_SEC: 8,
    WATCHDOG_MIN_MS: 15_000,
    LOG_QUEUE_MAX: 200,
    LOGGER_RING_MAX: 400,
    CACHE_NAME: "signix-tizen-media-v1",
  };
})(typeof window !== "undefined" ? window : globalThis);
