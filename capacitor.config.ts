import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Raiz do projeto (pasta onde está `capacitor.config.ts`).
 * Não usar só `process.cwd()`: o CLI/Gradle por vezes correm com cwd noutra pasta (ex. `android/`).
 */
function findCapacitorProjectRoot(): string {
  let dir = process.cwd();
  const seen = new Set<string>();
  for (;;) {
    if (seen.has(dir)) break;
    seen.add(dir);
    if (existsSync(resolve(dir, "capacitor.config.ts"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const configDir = findCapacitorProjectRoot();

/**
 * URL HTTPS do app publicado (rota do player, ex. .../player).
 * Ordem de leitura:
 * 1) variável de ambiente CAPACITOR_SERVER_URL
 * 2) ficheiro .env.capacitor (recomendado — não depende de lembrar o export no PowerShell)
 * 3) ficheiro .env (apenas a linha CAPACITOR_SERVER_URL=...)
 *
 * Depois de alterar: `npx cap sync android` e gere/instale o APK de novo.
 */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseEnvFileForKey(content: string, key: string): string | undefined {
  for (const raw of stripBom(content).split(/\r?\n/)) {
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
  const p = resolve(configDir, relativePath);
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

if (!liveUrl) {
  console.warn(
    "\n\x1b[33m[Signix Player TV]\x1b[0m CAPACITOR_SERVER_URL não encontrada.\n" +
      "  Crie o ficheiro " +
      resolve(configDir, ".env.capacitor") +
      " (copie de .env.capacitor.example) ou defina a variável de ambiente.\n" +
      "  Sem isto, o APK usa o placeholder em www/.\n",
  );
}

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
