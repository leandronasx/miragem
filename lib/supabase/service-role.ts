import type { Database } from "@/lib/database.types";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com Service Role — **apenas em Server Actions / Route Handlers**.
 * Nunca importe isto em `"use client"` nem prefixe a chave com NEXT_PUBLIC_.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
