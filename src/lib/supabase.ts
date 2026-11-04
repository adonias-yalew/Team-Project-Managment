/**
 * Supabase browser client — safe to import anywhere inside src/.
 *
 * Only the anon/public key and the project URL are used here.
 * The service-role key lives in .env.server.local and must never
 * be imported from this file or any file Vite bundles.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example → .env.local and fill in the values.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
