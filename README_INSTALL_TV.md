# Signix Player TV — Instalação e operação (TV Box / Android TV)

Guia passo a passo para **gerar o APK**, **instalar na TV Box**, **fullscreen**, **autostart**, **kiosk** e **teste offline**. Complementa `docs/android-tv-player.md` com foco operacional.

### Signix Player TV — APK sem URL do servidor

Se o APK foi instalado **sem** `CAPACITOR_SERVER_URL` definida no momento do `npx cap sync`, o WebView fica no placeholder local.

**No PC:** crie **`.env.capacitor`** (copie de **`.env.capacitor.example`**) com `CAPACITOR_SERVER_URL=https://.../player`, rode **`npx cap sync android`**, gere um **novo APK** e **instale de novo** na TV.

Passo a passo completo: **secção 1.2** abaixo. Arquitetura e variáveis: **`docs/android-tv-player.md`**.

---

## Pré-requisitos

| Item | Detalhe |
|------|-----------|
| Computador | Windows, macOS ou Linux com Node.js 20+ e npm |
| Android Studio | Instalado com **Android SDK** (API 35), **JDK 17+** e emulador opcional |
| Projeto Signix publicado em **HTTPS** | O app Android carrega o player pela URL do site (TanStack Start). Ex.: `https://seu-app.exemplo.com/player` |
| Variáveis do player no deploy | `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `ANON`) configurados no build do site |

---

## 1. Gerar o APK

### 1.1 Clonar / abrir o projeto

```bash
cd signix-display-pro
npm install
```

### 1.2 Apontar o WebView para o site publicado (obrigatório)

Se isto **não** for feito antes do `cap sync`, o APK abre só o **placeholder** em `www/` (“CAPACITOR_SERVER_URL não estiver definido”).

**Forma recomendada — ficheiro `.env.capacitor` (não esquece no PowerShell):**

1. Na raiz do projeto, copie o exemplo:

   ```bash
   copy .env.capacitor.example .env.capacitor
   ```

   (Linux/macOS: `cp .env.capacitor.example .env.capacitor`)

2. Edite **`.env.capacitor`** e defina a URL **HTTPS** onde o player funciona no browser (com `/player` no fim, se for esse o caminho):

   ```env
   CAPACITOR_SERVER_URL=https://SEU-DOMINIO/player
   ```

3. O ficheiro `.env.capacitor` está no **`.gitignore`** — não vai para o git.

**Windows (Explorador de ficheiros):** o nome tem de ser exactamente `.env.capacitor` — não `.env.capacitor.txt`. Ative **Ver → Mostrar → Extensões de nome de ficheiro** e confirme. O ficheiro deve ficar na **mesma pasta** que `package.json` e `capacitor.config.ts` (raiz de `signix-display-pro`), não dentro de `android/`.

Ao correr `npx cap sync android`, se a URL **não** for lida, aparece no terminal um aviso **`[Signix Player TV] CAPACITOR_SERVER_URL não encontrada`** com o caminho completo esperado do ficheiro — se não vir esse aviso e tiver criado o `.env.capacitor`, o sync encontrou a variável (ou o conteúdo do ficheiro está vazio / comentado).

**Alternativa — variável de ambiente só na sessão:**

**Windows (PowerShell):**

```powershell
$env:CAPACITOR_SERVER_URL="https://SEU-DOMINIO/player"
```

**Linux / macOS:**

```bash
export CAPACITOR_SERVER_URL="https://SEU-DOMINIO/player"
```

Também pode existir uma linha `CAPACITOR_SERVER_URL=...` no `.env` da raiz; o `capacitor.config.ts` lê essa chave se não houver valor nos passos acima.

Use sempre a URL **exata** que abre o player no Chrome (inclua `/player` se aplicável).

### 1.3 Build web + sincronizar Android

```bash
npm run android:release
```

Isso executa `vite build` e `npx cap sync android`, copiando a configuração (com `server.url`) para dentro de `android/`.

**Alternativa manual:**

```bash
npm run build
npx cap sync android
```

### 1.4 Abrir no Android Studio e gerar o APK

1. Abra o projeto Android:

   ```bash
   npx cap open android
   ```

2. Aguarde o Gradle sincronizar (primeira vez pode demorar).

3. **APK de debug (testes rápidos):** menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.  
   O arquivo fica em algo como:  
   `android/app/build/outputs/apk/debug/app-debug.apk`

4. **APK / AAB de release (loja ou produção):**  
   **Build → Generate Signed App Bundle or APK**  
   - Crie ou selecione um **keystore** (guarde a senha com segurança).  
   - Escolha **release**, finalize o assistente.  
   - Guarde o APK/AAB gerado fora do repositório se contiver assinatura sensível.

> **Versão do app:** alinhe `versionName` / `versionCode` em `android/app/build.gradle` com `src/player/version.ts` (`PLAYER_APP_VERSION`) antes de cada release pública.

---

## 2. Instalar na TV Box

### 2.1 Habilitar instalação de fontes desconhecidas

No Android da TV/box: **Configurações → Segurança** (ou **Apps especiais → Instalar apps desconhecidos**) e permita o app que vai instalar o APK (gerenciador de arquivos, navegador, **ADB**, etc.).

### 2.2 Opção A — Pendrive

1. Copie `app-debug.apk` (ou o release) para um pendrive em FAT32/exFAT.
2. Conecte na TV Box.
3. Abra o **gerenciador de arquivos** do aparelho, localize o APK e toque para instalar.
4. Confirme permissões e **Instalar**.  
5. Se aparecer “bloqueado por segurança”, volte ao passo 2.1 e libere a fonte correta.

### 2.3 Opção B — Downloader (URL pública)

1. Hospede o APK em um HTTPS confiável (drive interno, CDN, etc.).
2. Na TV, instale um app **Downloader** (ou similar).
3. Digite a URL do APK e baixe; em seguida abra o arquivo e instale.

### 2.4 Opção C — ADB pela rede ou USB

**USB:** ative **Depuração USB** nas opções de desenvolvedor, conecte o PC e:

```bash
adb install -r caminho/para/app-debug.apk
```

**Rede (TV e PC na mesma LAN):**

1. Na TV: **Opções do desenvolvedor → Depuração USB via Wi‑Fi** (nome varia).
2. No PC:

   ```bash
   adb connect IP_DA_TV:5555
   adb install -r app-debug.apk
   ```

### 2.5 Abrir o app

No launcher, procure **Signix Player TV** (ícone do app). Em Android TV, também pode aparecer na seção de apps para **Leanback** se o launcher suportar.

---

## 3. Ativar fullscreen

O app já tenta deixar a experiência **tela cheia** de duas formas:

1. **Nativo (Android):** ao carregar `/player`, o código chama o plugin **SignixTv** (imersivo + barra de status sobre o WebView + manter tela ligada). Isso é feito em `initAndroidTvShell()` na rota do player.
2. **Web:** `requestFullscreen()` no documento da página do player.

**Se ainda aparecer barra de navegação do sistema:**

- Em alguns aparelhos, deslize de baixo para cima uma vez e confirme **fixar em tela cheia** se o Android sugerir.
- Nas **Opções de desenvolvedor**, procure opções de **tamanho da barra de navegação** / **gestos** e teste **modo imersivo** (depende do fabricante).

**Reinício:** ao voltar ao app, o listener de `App` do Capacitor tenta reaplicar o modo imersivo.

---

## 4. Configurar autostart

O projeto inclui um **`BootReceiver`** que abre o **Signix Player TV** após o boot (`BOOT_COMPLETED`).

### 4.1 O que fazer na TV Box

1. Instale e **abra o app pelo menos uma vez** (muitos sistemas não disparam boot para apps nunca abertos).
2. Em **Configurações → Apps → Signix Player TV → Bateria** (ou “Uso de bateria”): escolha **Sem restrições** / **Não otimizar** / **Permitir atividade em segundo plano**, conforme o fabricante mostrar.
3. Se existir **Início automático** / **Auto-start** / **Gerir arranque**: ative para este app.
4. **Reinicie** a TV Box e verifique se o app abre sozinho.

### 4.2 Se não abrir após reinício

Fabricantes (Xiaomi, Amazon Fire TV, alguns boxes genéricos) **bloqueiam** ou **atrasam** arranque de apps. Tente:

- Desativar otimização de bateria para o app (passo 4.1).
- Desativar “limpeza de memória” agressiva ao desligar a tela.
- Em TVs com Android TV oficial, o comportamento costuma ser melhor que em boxes genéricos.

Não há garantia universal: documente o modelo que foi homologado.

---

## 5. Preparar kiosk mode (dispositivo dedicado)

### 5.1 Pinning / Lock Task (rápido, sem MDM)

1. Abra o player e deixe a reprodução normal.
2. Pressione a tecla **D** no controle/teclado (modo **admin** oculto).
3. Nos botões **Lock task** / **Sair lock**:
   - **Lock task:** chama `startLockTask()` no Android. Em muitos aparelhos o sistema pede confirmação ou só funciona se o app já estiver “fixado” pelo fluxo nativo.
   - **Sair lock:** encerra o pinning.

Se o sistema mostrar o assistente de **fixar ecrã / screen pinning**, siga as instruções na tela.

### 5.2 Kiosk corporativo (Device Owner / MDM)

Para **sair impossível sem PIN administrativo** ou políticas de empresa, é necessário:

- **Device Owner** provisionado por ferramenta EMM (Intune, VMware, etc.), ou
- **Modo dedicado** (COSU) conforme documentação Google para dispositivos geridos.

Isso **não** é configurado só pelo APK; exige perfil de trabalho ou reset de fábrica com QR de provisionamento. Use o MDM do cliente em projetos comerciais fechados.

---

## 6. Testar operação offline

### 6.1 Pré-condição

Com a rede **ligada**, deixe o player **pareado**, com playlist ativa e pelo menos um ciclo de **sync** concluído (para baixar payload e, quando possível, blobs de mídia no IndexedDB).

### 6.2 Procedimento de teste

1. Com o player em reprodução, **desative o Wi‑Fi** (ou desligue o cabo Ethernet) na TV Box.
2. Observe se:
   - A reprodução **continua** com itens já em cache, ou
   - Aparece fallback / mensagem de erro coerente com “sem rede e sem cache”.
3. **Reative a rede** e aguarde o intervalo de **sync** (configurável no painel admin com tecla **D**, campo “Sync (s)”).
4. Confirme que o conteúdo **atualiza** quando houver nova campanha no servidor.

### 6.3 Painel admin (tecla **D**) útil no teste

- **Último sync** / **Status rede**
- **Re-sync** manual
- **Limpar cache** (apaga blobs; use para simular “primeira instalação”)
- Ajuste temporário dos intervalos de heartbeat/sync para testes mais rápidos

### 6.4 Fila de logs offline

Com a rede off, os logs de reprodução podem **ficar na fila** local; ao restaurar a rede, o player tenta **reenviar** em background (intervalo de flush existente no runtime). Valide no painel/Supabase após voltar online.

---

## Referência rápida de comandos

```powershell
# PowerShell — definir URL e preparar Android
$env:CAPACITOR_SERVER_URL="https://SEU-DOMINIO/player"
npm run android:release
npx cap open android
```

```bash
# Instalar APK no dispositivo conectado
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Documentação adicional

- Detalhes técnicos (Capacitor, TanStack Start, módulos do player): **`docs/android-tv-player.md`**
- Variáveis de ambiente do site: **`.env.example`**
