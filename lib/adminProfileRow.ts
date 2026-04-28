import type { AdminProfileRow } from "@/types/database";

/** Converte uma linha `profiles` (ex.: `select('*')`) para o modelo do painel admin. */
export function toAdminProfileRow(row: unknown): AdminProfileRow {
  const r = row as Record<string, unknown>;
  const display_name =
    (typeof r.display_name === "string" && r.display_name.trim()) ||
    (typeof r.nome === "string" && r.nome.trim()) ||
    (typeof r.full_name === "string" && r.full_name.trim()) ||
    (typeof r.username === "string" && r.username.trim()) ||
    null;
  return {
    id: String(r.id ?? ""),
    email: r.email != null ? String(r.email) : null,
    display_name,
    is_admin: Boolean(r.is_admin),
    is_banned: Boolean(r.is_banned),
    balance_centavos: Number(r.balance_centavos ?? 0),
    diamonds: r.diamonds != null ? Number(r.diamonds) : null,
    created_at:
      r.created_at != null && r.created_at !== ""
        ? String(r.created_at)
        : undefined,
  };
}
