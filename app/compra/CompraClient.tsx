"use client";

import { MercadoPagoWalletCheckout } from "@/components/compra/MercadoPagoWalletCheckout";
import { DIAMOND_PACK_IDS, DIAMOND_PACKS, type DiamondPackId } from "@/lib/diamondPacks";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Gem, LoaderCircle, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function CompraClient() {
  const [diamondLoading, setDiamondLoading] = useState<DiamondPackId | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  /** Preferência MP após POST /api/create-preference (Wallet Brick + link alternativo). */
  const [mpCheckout, setMpCheckout] = useState<{
    preferenceId: string;
    initPoint: string;
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void supabase.auth
      .getSession()
      .then((res: { data: { session: Session | null } }) => {
        setUserId(res.data.session?.user?.id ?? null);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUserId(session?.user?.id ?? null);
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  const checkoutDiamondPack = useCallback(
    async (packId: DiamondPackId) => {
      setError(null);
      if (!userId) {
        setError("Faça login para comprar diamantes.");
        return;
      }
      setDiamondLoading(packId);
      setMpCheckout(null);
      try {
        const res = await fetch("/api/create-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diamond_pack: packId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Falha ao criar pagamento no Mercado Pago.");
          return;
        }
        const initPoint = typeof data.init_point === "string" ? data.init_point : "";
        const preferenceId = typeof data.id === "string" ? data.id : "";
        const hasPublicKey = Boolean(
          typeof process.env.NEXT_PUBLIC_MP_PUBLIC_KEY === "string" &&
            process.env.NEXT_PUBLIC_MP_PUBLIC_KEY.trim(),
        );
        if (preferenceId && initPoint) {
          if (hasPublicKey) {
            setMpCheckout({ preferenceId, initPoint });
            return;
          }
          window.location.href = initPoint;
          return;
        }
        setError("Resposta sem URL de pagamento.");
      } catch {
        setError("Erro de rede. Tente novamente.");
      } finally {
        setDiamondLoading(null);
      }
    },
    [userId],
  );

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-2xl flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,112,219,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative z-10 w-full text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Comprar diamantes
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          Pagamento seguro pelo Mercado Pago (cartão, Pix ou saldo na conta MP).
        </p>

        {!isSupabaseConfigured() ? (
          <p className="mx-auto mt-8 max-w-md rounded-xl border border-[var(--border-glow)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
            Configure o Supabase no{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-zinc-300">
              .env.local
            </code>{" "}
            para continuar.
          </p>
        ) : null}

        {error ? (
          <p
            className="mx-auto mt-6 max-w-md rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3 text-sm text-red-200/90"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {mpCheckout ? (
          <div className="mx-auto mt-8 w-full max-w-lg rounded-2xl border border-[var(--border-glow)] bg-[var(--card)] p-4 text-left shadow-[0_0_40px_-18px_rgba(147,112,219,0.25)]">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Pagamento Mercado Pago
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Use o botão abaixo (Checkout Pro / Wallet Brick). Pix e outros meios
              dependem da sua conta MP.
            </p>
            <div className="mt-4">
              <MercadoPagoWalletCheckout preferenceId={mpCheckout.preferenceId} />
            </div>
            <a
              href={mpCheckout.initPoint}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-violet-500/30 bg-violet-950/20 px-4 py-2.5 text-sm font-medium text-violet-200 hover:bg-violet-950/40"
            >
              Abrir checkout em página completa
            </a>
            <button
              type="button"
              onClick={() => setMpCheckout(null)}
              className="mt-2 w-full text-center text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Fechar
            </button>
          </div>
        ) : null}

        <div className="mx-auto mt-10 grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-3">
          {DIAMOND_PACK_IDS.map((packId) => {
            const pack = DIAMOND_PACKS[packId];
            const busy = diamondLoading === packId;
            return (
              <button
                key={packId}
                type="button"
                disabled={busy || !isSupabaseConfigured()}
                onClick={() => void checkoutDiamondPack(packId)}
                className="flex flex-col items-center rounded-2xl border border-[var(--border-glow)] bg-[var(--card)] p-6 text-center shadow-[0_0_40px_-18px_rgba(147,112,219,0.25)] transition hover:border-violet-400/30 hover:shadow-[0_0_48px_-14px_rgba(147,112,219,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Gem
                  className="h-9 w-9 text-violet-300/90"
                  aria-hidden
                />
                <p className="mt-4 text-2xl font-bold tabular-nums text-[var(--foreground)]">
                  {pack.diamonds}{" "}
                  <span className="text-base font-semibold text-violet-200/80">
                    diamantes
                  </span>
                </p>
                <p className="mt-2 min-h-[2.5rem] text-xs leading-relaxed text-[var(--muted)]">
                  {pack.subtitle}
                </p>
                <p className="mt-4 text-lg font-semibold tabular-nums text-emerald-300/95">
                  {pack.unit_price.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  {busy ? (
                    <LoaderCircle
                      className="h-4 w-4 shrink-0 animate-spin text-violet-300"
                      aria-hidden
                    />
                  ) : (
                    <Wallet
                      className="h-4 w-4 shrink-0 text-violet-300/90"
                      aria-hidden
                    />
                  )}
                  Mercado Pago
                </span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-6 max-w-lg">
          <p className="rounded-2xl border border-amber-400/25 bg-[rgba(15,10,24,0.55)] px-4 py-3 text-center text-xs font-semibold text-amber-200 shadow-[0_0_36px_-18px_rgba(245,158,11,0.55)]">
            Promoção premium:{" "}
            <span className="font-bold text-amber-300">
              evento de inauguração
            </span>{" "}
            — os preços poderão ser reajustados após o término.
          </p>
        </div>

        {!userId && isSupabaseConfigured() ? (
          <p className="mt-8 text-sm text-[var(--muted)]">
            <a
              href="/login?next=/compra"
              className="font-medium text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
            >
              Entrar
            </a>{" "}
            para comprar.
          </p>
        ) : null}
      </div>
    </main>
  );
}
