import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { create } from "zustand";

type CreditRpcResult = Record<string, unknown> | null;

function pickDiamondsFromRpc(data: unknown): number | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const v = o.diamonds ?? o.new_balance ?? o.balance;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseBalanceRpc(data: unknown): number {
  if (typeof data === "number" && Number.isFinite(data)) {
    return Math.max(0, Math.floor(data));
  }
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === "number" && Number.isFinite(first)) {
      return Math.max(0, Math.floor(first));
    }
  }
  const n = Number(data ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

type DiamondsState = {
  diamonds: number;
  loadDiamonds: (userEmail: string) => Promise<void>;
  creditDiamonds: (amount: number) => Promise<void>;
  reset: () => void;
};

export const useDiamondsStore = create<DiamondsState>((set, get) => ({
  diamonds: 0,

  reset: () => {
    set({ diamonds: 0 });
  },

  loadDiamonds: async (userEmail: string) => {
    const email = userEmail.trim();
    if (!email) {
      return;
    }
    if (!isSupabaseConfigured()) {
      return;
    }
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user?.id) {
        set({ diamonds: 0 });
        return;
      }

      const { data: balance, error: balanceError } = await supabase.rpc(
        "get_user_balance",
        { user_id_param: user.id },
      );

      if (balanceError) {
        console.warn("[diamonds] get_user_balance:", balanceError.message);
        set({ diamonds: 0 });
        return;
      }

      const fromRpc = pickDiamondsFromRpc(balance);
      const n =
        fromRpc != null ? Math.max(0, Math.floor(fromRpc)) : parseBalanceRpc(balance);
      set({ diamonds: n });
    } catch (e) {
      console.warn("[diamonds] loadDiamonds", e);
      set({ diamonds: 0 });
    }
  },

  creditDiamonds: async (amount: number) => {
    const amt = Math.floor(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return;
    }
    if (!isSupabaseConfigured()) {
      return;
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session?.user?.email?.trim();
      if (!email) {
        return;
      }

      const { data, error } = await supabase.rpc("credit_diamonds_by_email", {
        p_amount: amt,
        p_email: email,
      });

      if (error) {
        throw error;
      }

      const fromRpc = pickDiamondsFromRpc(data as CreditRpcResult);
      if (fromRpc != null) {
        set({ diamonds: fromRpc });
      } else {
        await get().loadDiamonds(email);
      }
    } catch (e) {
      console.warn("[diamonds] creditDiamonds", e);
      throw e;
    }
  },
}));
