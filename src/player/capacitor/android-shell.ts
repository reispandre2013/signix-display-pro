import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SignixTv } from "@/player/capacitor/signix-tv";

let resumeListenerAttached = false;

/**
 * Inicializa shell Android TV: splash, status bar sobre o WebView, immersive e tela ligada.
 * No browser não faz nada.
 */
export async function initAndroidTvShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SplashScreen.hide().catch(() => undefined);
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    await StatusBar.hide().catch(() => undefined);
  } catch {
    // ignora se plugin não estiver disponível
  }
  try {
    await SignixTv.enterImmersive();
    await SignixTv.setKeepScreenOn({ on: true });
  } catch {
    // WebView ainda pode usar fullscreen via API web
  }

  if (!resumeListenerAttached) {
    resumeListenerAttached = true;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive && Capacitor.getPlatform() === "android") {
        void SignixTv.enterImmersive().catch(() => undefined);
      }
    });
  }
}

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
