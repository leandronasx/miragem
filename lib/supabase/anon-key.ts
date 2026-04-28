function decodeJwtPayloadSegment(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Chaves `sb_secret_*` são apenas para servidor (Service Role / API secret).
 * No browser só podem ir chaves anon / publishable (`sb_publishable_*` ou JWT anon legado).
 * JWT com `role: "service_role"` também é inválido em NEXT_PUBLIC_*.
 */
export function assertBrowserSafeSupabaseKey(key: string, context: string): void {
  const trimmed = key.trim();
  if (trimmed.startsWith("sb_secret_")) {
    throw new Error(
      `${context}: NEXT_PUBLIC_SUPABASE_ANON_KEY está com uma chave SECRETA (sb_secret_…). ` +
        `No Dashboard → Settings → API, use a chave "anon" / "publishable" para variáveis NEXT_PUBLIC_. ` +
        `A Service Role / secret deve ficar só em SUPABASE_SERVICE_ROLE_KEY (sem NEXT_PUBLIC_) no servidor.`,
    );
  }
  if (trimmed.startsWith("eyJ")) {
    const parts = trimmed.split(".");
    if (parts.length >= 2) {
      const payload = decodeJwtPayloadSegment(parts[1]);
      if (payload?.role === "service_role") {
        throw new Error(
          `${context}: NEXT_PUBLIC_SUPABASE_ANON_KEY parece ser um JWT de Service Role (role=service_role). ` +
            `Use no Dashboard a chave anon/public (publishable) em variáveis NEXT_PUBLIC_; a service_role só em SUPABASE_SERVICE_ROLE_KEY no servidor.`,
        );
      }
    }
  }
}
