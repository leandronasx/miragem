"use client";

import type { Database } from "@/lib/database.types";
import { assertBrowserSafeSupabaseKey } from "@/lib/supabase/anon-key";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase do browser (anon / publishable) — uma única instância GoTrue.
 * Importe sempre `supabase` daqui; não instancie `createBrowserClient` noutros sítios.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let browserClient: SupabaseClient<Database> | null = null;

function withRestCacheBustUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.pathname.includes("/rest/v1/")) return url;
    return u.toString();
  } catch {
    return url;
  }
}

function supabaseListVideosFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  headers.set("Pragma", "no-cache");

  let resource: RequestInfo | URL = input;
  if (typeof input === "string") {
    resource = withRestCacheBustUrl(input);
  } else if (input instanceof URL) {
    resource = withRestCacheBustUrl(input.href);
  } else if (typeof Request !== "undefined" && input instanceof Request) {
    resource = new Request(withRestCacheBustUrl(input.url), input);
  }

  return fetch(resource, {
    ...init,
    cache: "no-store",
    headers,
  });
}

function getBrowserClientSingleton(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local",
    );
  }
  assertBrowserSafeSupabaseKey(key, "supabaseClient (browser)");
  browserClient = createBrowserClient<Database>(url, key, {
    global: {
      fetch: supabaseListVideosFetch,
    },
  });
  return browserClient;
}

/**
 * Instância única (lazy): primeiro acesso a `.auth` / `.from` / etc. inicializa o cliente.
 */
export const supabase: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop, receiver) {
      const client = getBrowserClientSingleton();
      const value = Reflect.get(client, prop, receiver);
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  },
);

/** @deprecated Mesmo que `supabase` — mantido só para código legado. */
export function createVideosListSupabaseClient(): SupabaseClient<Database> {
  return getBrowserClientSingleton();
}
