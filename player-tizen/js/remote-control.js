(function (global) {
  "use strict";

  /**
   * Controlo remoto Tizen / Samsung TV (Web).
   * Setas: item anterior / seguinte; Enter: sincronizar; Back: sair ou repor pareamento em modo debug.
   */
  function installRemoteControl(handlers) {
    var h = handlers || {};

    function onKeyDown(ev) {
      var key = ev.key;
      var code = ev.keyCode;

      if (key === "ArrowLeft" || code === 37) {
        if (h.onLeft) h.onLeft(ev);
        ev.preventDefault();
        return;
      }
      if (key === "ArrowRight" || code === 39) {
        if (h.onRight) h.onRight(ev);
        ev.preventDefault();
        return;
      }
      if (key === "ArrowUp" || code === 38) {
        if (h.onUp) h.onUp(ev);
        ev.preventDefault();
        return;
      }
      if (key === "ArrowDown" || code === 40) {
        if (h.onDown) h.onDown(ev);
        ev.preventDefault();
        return;
      }
      if (key === "Enter" || code === 13) {
        if (h.onEnter) h.onEnter(ev);
        ev.preventDefault();
        return;
      }

      /* Samsung / Tizen Back */
      if (code === 10009 || key === "XF86Back" || key === "BrowserBack") {
        if (h.onBack) h.onBack(ev);
        ev.preventDefault();
        return;
      }

      /* Teclas de cor (alguns modelos) — úteis para debug */
      if (code === 403 || key === "Red") {
        if (h.onRed) h.onRed(ev);
        return;
      }
      if (code === 404 || key === "Green") {
        if (h.onGreen) h.onGreen(ev);
        return;
      }
    }

    global.addEventListener("keydown", onKeyDown, true);

    return function uninstall() {
      global.removeEventListener("keydown", onKeyDown, true);
    };
  }

  function tryExitApplication() {
    try {
      if (global.tizen && global.tizen.application && global.tizen.application.getCurrentApplication) {
        global.tizen.application.getCurrentApplication().exit();
        return true;
      }
    } catch (e) {
      /* browser */
    }
    return false;
  }

  global.signixRemote = {
    installRemoteControl: installRemoteControl,
    tryExitApplication: tryExitApplication,
  };
})(typeof window !== "undefined" ? window : globalThis);
