"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { headers } from "next/headers";

/** Registra um evento de login (IP + e-mail) para o painel Admin. */
export async function recordMyLoginAction(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    if (!supabase) return { ok: false };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip =
      fwd?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      h.get("cf-connecting-ip") ??
      null;

    const service = createServiceRoleClient();
    const sb = service ?? supabase;

    const { error } = await sb.from("login_events").insert({
      user_id: user.id,
      email: user.email ?? "",
      ip,
    });
    if (error) {
      console.error("[login-tracker]", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[login-tracker]", e);
    return { ok: false };
  }
}
