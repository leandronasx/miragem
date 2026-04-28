"use client";

import { getMirageApiBase } from "@/lib/mirageApi";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const LS_KEY = "mirage-diamonds";

async function fetchDiamondsFromBackend(userId: string): Promise<number> {
  const base = getMirageApiBase();
  if (!base) return 0;
  try {
    const res = await fetch(
      `${base}/api/diamonds?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as { balance?: number };
    return typeof data.balance === "number" ? data.balance : 0;
  } catch {
    return 0;
  }
}

async function debitDiamondsOnBackend(
  userId: string,
  amount: number,
): Promise<number> {
  const base = getMirageApiBase();
  if (!base) throw new Error("Backend não configurado");
  let res: Response;
  try {
    res = await fetch(`${base}/api/diamonds/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount }),
    });
  } catch {
    throw new Error("Não foi possível contactar o servidor de diamantes.");
  }
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    newBalance?: number;
    error?: string;
  };
  if (!res.ok || data.ok === false) {
    const err = (data.error || "").toLowerCase();
    if (err.includes("insuficiente") || res.status === 400) {
      throw new Error("Saldo insuficiente");
    }
    throw new Error(data.error || "Erro ao usar diamantes");
  }
  if (typeof data.newBalance !== "number") {
    throw new Error("Resposta inválida do servidor");
  }
  return data.newBalance;
}

/**
 * Saldo de diamantes do utilizador.
 * Com Supabase configurado, lê sempre `profiles` no cliente (evita "Failed to fetch"
 * quando `NEXT_PUBLIC_MIRAGE_API_BASE` aponta para um Express offline).
 * Sem Supabase, tenta o backend Express; por fim localStorage.
 */
export async function fetchDiamondBalance(userId: string | null): Promise<number> {
  if (!userId) return 0;

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("profiles")
      .select("diamonds")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("[diamonds] fetchDiamondBalance Supabase:", error.message);
      return 0;
    }
    const row = data as { diamonds?: number | null } | null;
    return Math.max(0, Math.floor(Number(row?.diamonds ?? 0)));
  }

  if (getMirageApiBase()) {
    return fetchDiamondsFromBackend(userId);
  }

  return parseInt(
    typeof window !== "undefined"
      ? localStorage.getItem(LS_KEY) || "0"
      : "0",
    10,
  );
}

/**
 * Com Supabase: RPC `debit_diamonds`. Caso contrário: Express (se configurado) → localStorage.
 */
export async function debitDiamondsClient(
  userId: string | null,
  amount: number,
): Promise<number> {
  if (!userId) throw new Error("Não logado");
  const amt = Math.floor(amount);
  if (amt <= 0) throw new Error("Valor inválido");

  if (isSupabaseConfigured()) {
    // A RPC pode ter nomes de args diferentes dependendo do SQL aplicado.
    // Preferimos `amount_to_debit` (novo), com fallback para `amount` (legado).
    let data: unknown = null;
    let error: { message?: string } | null = null;

    const r1 = await supabase.rpc("debit_diamonds", { amount_to_debit: amt } as unknown as {
      amount_to_debit: number;
    });
    data = r1.data;
    error = (r1.error as unknown as { message?: string } | null) ?? null;

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      // fallback: arg name mismatch (ex.: function expects `amount`)
      if (msg.includes("amount_to_debit") || msg.includes("function") || msg.includes("signature")) {
        const r2 = await supabase.rpc("debit_diamonds", { amount: amt } as unknown as {
          amount: number;
        });
        data = r2.data;
        error = (r2.error as unknown as { message?: string } | null) ?? null;
      }
    }

    if (error) throw new Error(error.message || "Erro ao usar diamantes");
    const newBalance = data as number | null;
    if (newBalance === -1 || newBalance === null) {
      throw new Error("Saldo insuficiente");
    }
    return newBalance;
  }

  if (getMirageApiBase()) {
    try {
      return await debitDiamondsOnBackend(userId, amt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(msg || "Erro ao usar diamantes");
    }
  }

  const cur = parseInt(localStorage.getItem(LS_KEY) || "0", 10);
  if (cur < amt) throw new Error("Saldo insuficiente");
  const next = cur - amt;
  localStorage.setItem(LS_KEY, String(next));
  return next;
}
