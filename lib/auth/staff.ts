import type { User } from "@supabase/supabase-js";

export type StaffRole = "admin" | "mod";

const OWNER_EMAIL =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_MIRAGE_OWNER_EMAIL
    : undefined) ?? "wonswonsx@gmail.com";

export function getStaffRole(user: User | null): StaffRole | null {
  const r = (user?.user_metadata as { role?: string } | undefined)?.role;
  if (r === "admin" || r === "mod") return r;
  return null;
}

/**
 * Quem pode aceder a `/admin` e acções staff: `user_metadata.role` admin/mod,
 * ou `user_metadata.is_admin`, ou o e-mail do dono (env).
 * Mantém o mesmo critério que o separador Admin no header.
 */
export function isStaff(user: User | null): boolean {
  if (!user) return false;
  if (getStaffRole(user) != null) return true;
  const meta = user.user_metadata as { is_admin?: boolean } | undefined;
  if (meta?.is_admin === true) return true;
  const em = user.email?.trim().toLowerCase();
  if (em && em === OWNER_EMAIL.trim().toLowerCase()) return true;
  return false;
}

/** Apenas admins (exclui mods). */
export function isAdminStaff(user: User | null): boolean {
  if (!user) return false;
  if (getStaffRole(user) === "admin") return true;
  const meta = user.user_metadata as { is_admin?: boolean } | undefined;
  if (meta?.is_admin === true) return true;
  const em = user.email?.trim().toLowerCase();
  if (em && em === OWNER_EMAIL.trim().toLowerCase()) return true;
  return false;
}
