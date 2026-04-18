import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

/**
 * URL HTTPS do app publicado (rota do player, ex. .../player).
 * Ordem de leitura:
 * 1) variável de ambiente CAPACITOR_SERVER_URL
 * 2) ficheiro .env.capacitor (recomendado — não depende de lembrar o export no PowerShell)
 * 3) ficheiro .env (apenas a linha CAPACITOR_SERVER_URL=...)
 *
 * Depois de alterar: `npx cap sync android` e gere/instale o APK de novo.
 */
function parseEnvFileForKey(content: string, key: string): string | undefined {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const k = line.slice(0, eq).trim();
    if (k !== key) continue;
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    const out = v.trim();
    return out.length > 0 ? out : undefined;
  }
  return undefined;
}

function readCapacitorUrlFromFile(relativePath: string): string | undefined {
  const p = resolve(process.cwd(), relativePath);
  if (!existsSync(p)) return undefined;
  try {
    const text = readFileSync(p, "utf8");
    return parseEnvFileForKey(text, "CAPACITOR_SERVER_URL");
  } catch {
    return undefined;
  }
}

const liveUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  readCapacitorUrlFromFile(".env.capacitor") ||
  readCapacitorUrlFromFile(".env");

const config: CapacitorConfig = {
  appId: "com.signix.player.tv",
  appName: "Signix Player TV",
  webDir: "www",
  server: liveUrl
    ? {
        url: liveUrl,
        cleartext: liveUrl.startsWith("http://"),
      }
    : undefined,
  android: {
    appendUserAgent: " SignixPlayerTV/1.0",
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
