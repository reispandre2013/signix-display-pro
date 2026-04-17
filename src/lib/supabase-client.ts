import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase central. Usa a chave publicável (publishable/anon) — nunca service_role no browser.
 */
export function getSupabaseUrl(): string | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return typeof url === "string" && url.length > 0 ? url : undefined;
}

/** Chave pública: aceita VITE_SUPABASE_PUBLISHABLE_KEY ou legado VITE_SUPABASE_ANON_KEY (Lovable/preview). */
export function getSupabasePublishableKey(): string | undefined {
  const pub = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const key =
    typeof pub === "string" && pub.length > 0
      ? pub
      : typeof anon === "string" && anon.length > 0
        ? anon
        : undefined;
  return key;
}

export function getSupabaseProjectId(): string | undefined {
  const id = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export const hasSupabaseEnv = Boolean(getSupabaseUrl() && getSupabasePublishableKey());

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabaseEnv) return null;
  if (_client) return _client;
  const url = getSupabaseUrl()!;
  const key = getSupabasePublishableKey()!;
  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

/** Alias estável para importações que esperam `supabase` singular. */
export const supabase = getSupabase();
