// SERVER-ONLY. Nunca importar em código de cliente.
// Usa a service role key para bypassar RLS em operações admin.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    "[supabaseAdmin] SUPABASE_URL ou SERVICE_ROLE_KEY ausentes no ambiente do servidor.",
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});
