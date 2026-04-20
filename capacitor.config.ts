import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Remove BOM e caracteres invisíveis que corrompem o hostname no WebView (ex.: net::ERR_NAME_NOT_RESOLVED). */
function sanitizeServerUrl(raw: string): string {
  const s = raw
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return s;
    return u.href;
  } catch {
    return s;
  }
}

const envFile = resolve(process.cwd(), ".env.capacitor");
const fileEnv = loadDotEnvFile(envFile);
/** Sem .env: abre pareamento (TV mostra código). Use ?platform=tizen|android conforme o dispositivo. */
const serverUrl = sanitizeServerUrl(
  process.env.CAPACITOR_SERVER_URL ??
    fileEnv.CAPACITOR_SERVER_URL ??
    "https://signix-stream.lovable.app/pareamento",
);

const config: CapacitorConfig = {
  appId: "com.signix.player.tv",
  appName: "Signix Player TV",
  webDir: "dist",
  server: {
    url: serverUrl,
    cleartext: false,
  },
  android: {
    appendUserAgent: " SignixPlayerTV/1.0.10",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0a0a0f",
    },
  },
};

export default config;
