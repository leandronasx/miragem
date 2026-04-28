import type { Database } from "@/lib/database.types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service Role — só em rotas de servidor (ex.: webhook). Nunca exponha ao browser. */
export function createAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
