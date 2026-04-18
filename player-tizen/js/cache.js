(function (global) {
  "use strict";

  var C = global.SIGNIX_TIZEN_CONSTANTS || {};

  function hasCacheApi() {
    return typeof global.caches !== "undefined" && typeof global.caches.open === "function";
  }

  function open() {
    if (!hasCacheApi()) return Promise.resolve(null);
    return global.caches.open(C.CACHE_NAME || "signix-tizen-media-v1");
  }

  /**
   * Tenta devolver Response em cache; senão faz fetch, grava no cache e devolve clone.
   */
  function fetchAndCache(requestUrl, init) {
    return open().then(function (cache) {
      if (!cache) {
        return fetch(requestUrl, init || {});
      }
      return cache.match(requestUrl).then(function (cached) {
        if (cached) return cached;
        return fetch(requestUrl, init || {}).then(function (res) {
          if (res && res.ok && res.status === 200) {
            try {
              cache.put(requestUrl, res.clone());
            } catch (e) {
              /* ignore */
            }
          }
          return res;
        });
      });
    });
  }

  /**
   * Para <video>/<img> src blob: opcional — aqui só devolve URL direta ou blob URL após fetch.
   */
  function resolvePlayableUrl(url) {
    if (!url) return Promise.resolve(null);
    return fetchAndCache(url, { mode: "cors", credentials: "omit" }).then(function (res) {
      if (!res || !res.ok) return url;
      try {
        return res.url;
      } catch (e) {
        return url;
      }
    });
  }

  global.signixCache = {
    hasCacheApi: hasCacheApi,
    fetchAndCache: fetchAndCache,
    resolvePlayableUrl: resolvePlayableUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
