import type { Database } from "@/lib/database.types";
import { assertBrowserSafeSupabaseKey } from "@/lib/supabase/anon-key";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Sessão do usuário no servidor — sempre chave anon/public, nunca Service Role. */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }

  assertBrowserSafeSupabaseKey(key, "createClient (server)");

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component — cookies podem ser read-only */
        }
      },
    },
  });
}
