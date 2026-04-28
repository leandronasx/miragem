/**
 * Reexport do cliente browser — implementação única em `@/lib/supabaseClient`.
 */
import {
  supabase,
  isSupabaseConfigured,
  createVideosListSupabaseClient,
} from "@/lib/supabaseClient";

export { supabase, isSupabaseConfigured, createVideosListSupabaseClient };

/** @deprecated Importe `supabase` de `@/lib/supabaseClient`. */
export function createClient() {
  return supabase;
}
