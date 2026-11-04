import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env["VITE_SUPABASE_URL"]?.trim();
const key = (
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_ANON_KEY"]
)?.trim();

export const supabaseConfigError =
  !url || !key
    ? "Supabase is not configured. Copy .env.example to .env.local and add the project URL and publishable key."
    : undefined;

let clientPromise: Promise<SupabaseClient<Database> | null> | undefined;

export function getSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  if (supabaseConfigError) return Promise.resolve(null);
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient<Database>(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return clientPromise;
}
