/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** Chave pública (preferida). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Alias legado (Lovable / exemplos antigos). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** ID do projeto (metadado / tooling; opcional no runtime). */
  readonly VITE_SUPABASE_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
