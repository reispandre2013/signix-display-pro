# Signix Player — Android TV / TV Box (Capacitor)

Este documento descreve como o **player web atual** (`/player`, `src/player/**`) é empacotado como app Android profissional, com fullscreen, autostart, kiosk e integração Supabase existente.

## 1. Arquitetura

| Camada | Função |
|--------|--------|
| **Web (núcleo)** | `usePlayerRuntime`, pareamento, sync, playlist, heartbeat, fila de logs — inalterado em essência. |
| **Capacitor** | WebView nativa + plugins (`App`, `StatusBar`, `SplashScreen`). |
| **Plugin `SignixTv`** | Imersivo (system bars), `FLAG_KEEP_SCREEN_ON`, `startLockTask` / `stopLockTask`. |
| **BootReceiver** | Abre `MainActivity` após `BOOT_COMPLETED` (sujeito a OEM). |

### Módulos web (`src/player/`)

- **Core / playback:** `hooks/use-player-runtime.ts`, `components/playback-screen.tsx`
- **Pairing:** `components/activation-screen.tsx`, `services/player-api.ts` (`pairScreen`), `storage/player-local.ts`
- **Sync / payload:** `services/sync-service.ts`, `services/player-api.ts` (`resolveScreenPayload`)
- **Cache offline:** `services/media-cache.ts` (IndexedDB + limpeza por tamanho), `storage/idb.ts`
- **Heartbeat / logs:** `services/player-api.ts`, `services/log-queue.ts`
- **Settings / debug:** `config.ts`, `components/admin-overlay.tsx` (tecla **D**)
- **Versão app:** `version.ts` — alinhar com `android/app/build.gradle` → `versionName`
- **Android bridge:** `capacitor/android-shell.ts`, `capacitor/signix-tv.ts`

## 2. Por que usar `CAPACITOR_SERVER_URL` (recomendado)

O projeto usa **TanStack Start** (SSR / worker Cloudflare). O build **não gera** um `index.html` estático único em `dist/client/` consumível offline pelo WebView como SPA clássica.

**Modo suportado para produção:** o APK carrega a **URL HTTPS** do app já publicado (ex.: Lovable / Cloudflare), apontando para a rota do player:

```text
https://SEU-DOMINIO/player
```

**Antes de `npx cap sync`**, defina a URL de uma destas formas (por ordem o `capacitor.config.ts` usa: env → `.env.capacitor` → `.env`):

1. **Recomendado:** ficheiro **`.env.capacitor`** na raiz (copie de `.env.capacitor.example`):

   ```env
   CAPACITOR_SERVER_URL=https://seu-app.exemplo.com/player
   ```

2. Variável de ambiente na sessão:

```bash
# Linux/macOS
export CAPACITOR_SERVER_URL="https://seu-app.exemplo.com/player"

# Windows PowerShell
$env:CAPACITOR_SERVER_URL="https://seu-app.exemplo.com/player"
```

Depois:

```bash
npx cap sync android
npx cap open android
```

> Sem URL após o sync, o APK mostra o placeholder em `www/` — é preciso **novo sync + novo APK**.

Scripts npm:

- `npm run android:release` — `vite build` + `cap sync` (sem URL: usa assets em `www/`).
- `npm run android:live` — exige `CAPACITOR_SERVER_URL` + sync + abre Android Studio.

`capacitor.config.ts` lê `process.env.CAPACITOR_SERVER_URL` no momento do **sync** e grava em `capacitor.config.json` dentro do projeto Android.

## 3. Build do APK

1. Instale **Android Studio**, **JDK 17+** e **Android SDK** (API 35 alinhado ao projeto).
2. Publique o site (painel + player) em HTTPS com `.env` de produção (`VITE_SUPABASE_*`).
3. Defina `CAPACITOR_SERVER_URL` como acima e rode:

   ```bash
   npm run android:live
   ```

   ou:

   ```bash
   npm run android:release
   npx cap open android
   ```

4. No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)** (debug) ou configure **assinatura release** (menu Build → Generate Signed Bundle / APK).

### Assinatura release

- Crie um keystore (`keytool`) ou use o fluxo do Android Studio.
- Ajuste `android/app/build.gradle` com `signingConfigs` release (não commitar senhas).
- `versionCode` / `versionName` em `defaultConfig` devem subir a cada release público.

## 4. Instalação em TV Box / Android TV

- **ADB:** `adb install -r app-debug.apk`
- **Pendrive:** copie o APK, abra um gerenciador de arquivos na TV e instale (ative “fontes desconhecidas” se o fabricante exigir).
- **Downloader:** apps como “Downloader” podem buscar URL direta do APK.
- **Rede:** `adb connect IP:5555` em boxes com depuração Wi‑Fi.

Permissões usadas: `INTERNET`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`. O app declara **LEANBACK_LAUNCHER** para aparecer no launcher de Android TV.

## 5. Fullscreen e TV

- Web: `requestFullscreen()` na rota `/player`.
- Nativo: plugin **SignixTv.enterImmersive()** (chamado em `initAndroidTvShell()` ao abrir o player).
- `StatusBar` / `SplashScreen` configurados em `capacitor.config.ts` e `android-shell.ts`.

## 6. Autostart (`BootReceiver`)

`BootReceiver` dispara `MainActivity` após boot. **Limitações comuns:**

- Fabricantes (Xiaomi, Huawei, Amazon Fire TV) **matam** ou **atrasam** apps em boot salvo exceção de “início automático” / bateria.
- Android Go / modo restrito pode exigir o usuário abrir o app uma vez.
- **Direct boot:** o receiver declara `directBootAware`; mídia criptografada até o utilizador desbloquear pode afetar rede.

Documente no rollout qual modelo de box foi validado.

## 7. Kiosk / Lock Task

- **Botões no painel admin (tecla D):** “Lock task” / “Sair lock” chamam `Activity.startLockTask()` / `stopLockTask()`.
- Em muitos dispositivos o **pinning** exige confirmação do sistema ou perfil de trabalho.
- **Device Owner** (MDM corporativo) permite kiosk fixo; isso **não** é configurado automaticamente pelo app — exige provisionamento empresarial.

## 8. Cache offline e playback

- Já existente: `sync-service` usa payload em cache se a rede falhar; `media-cache` grava blobs no IndexedDB; `use-player-runtime` avança item em erro (vídeo/HTML/imagem) e watchdog.
- **Novo:** `pruneMediaCache()` remove blobs antigos quando o total ultrapassa ~450 MB (ajustável em `media-cache.ts`).

## 9. Heartbeat e logs

- Inalterados: intervalos em `PlayerSettings` (admin), `sendHeartbeat`, `queuePlaybackLog` + flush quando online.
- `PLAYER_VERSION_LABEL` (`src/player/version.ts`) é enviado em pareamento e heartbeat.

## 10. Pareamento e credenciais

- Credenciais em `player-local` (IndexedDB + chaves em `idbStore`).
- Código expirado é validado no Edge Function `pair-screen` (backend).
- “Reset pareamento” no admin limpa credenciais e volta à ativação.

## 11. Checklist de testes (TV Box / Android TV)

- [ ] Instalar APK e abrir app (splash some, entra no WebView).
- [ ] Com `CAPACITOR_SERVER_URL` correto, carregar `/player` e parear tela.
- [ ] Reproduzir playlist em loop (imagem / vídeo / HTML conforme suporte web).
- [ ] Desligar Wi‑Fi: continua com último payload + blobs em cache quando possível.
- [ ] Religar Wi‑Fi: novo sync e atualização de mídia.
- [ ] Heartbeat visível no painel / Supabase.
- [ ] Logs de reprodução (fila offline + flush).
- [ ] Item inválido: avança sem travar permanentemente.
- [ ] Fullscreen / sem barras aparentes.
- [ ] Tecla **D**: admin — re-sync, limpar cache, lock task.
- [ ] Reinício do dispositivo: app tenta abrir sozinho (validar por modelo).
- [ ] Versão em admin coincide com `versionName` Android após bump.

## 12. Referências

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Android TV leanback](https://developer.android.com/training/tv/start/start)
- [Lock task mode](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode)
