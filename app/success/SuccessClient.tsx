"use client";

import { DarkAppHeader } from "@/components/DarkAppHeader";
import { useDiamondsStore } from "@/lib/stores/useDiamondsStore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function SuccessClient() {
  const searchParams = useSearchParams();
  const diamonds = useDiamondsStore((s) => s.diamonds);
  const [message, setMessage] = useState("Processando pagamento…");

  const paymentRef = useMemo(() => {
    const paymentId = searchParams.get("payment_id") ?? "";
    const prefId = searchParams.get("preference_id") ?? "";
    const merchantOrderId = searchParams.get("merchant_order_id") ?? "";
    return paymentId || merchantOrderId || prefId || "";
  }, [searchParams]);

  useEffect(() => {
    // Crédito é feito exclusivamente pelo webhook do Mercado Pago (fonte de verdade).
    // Aqui só informamos o usuário e exibimos o saldo quando ele atualizar no header/store.
    setMessage(
      "Pagamento concluído. Se comprou diamantes, o saldo pode levar alguns instantes para aparecer.",
    );
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] pt-[104px] text-[var(--foreground)]">
      <DarkAppHeader />
      <main className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Obrigado!</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>
        {paymentRef ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Referência:{" "}
            <span className="font-medium tabular-nums text-violet-200">
              {paymentRef}
            </span>
          </p>
        ) : null}
        <p className="mt-6 text-sm tabular-nums text-violet-200">
          💎 {diamonds}
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-[var(--border-glow)] bg-[var(--card)] px-5 py-2.5 text-sm font-medium no-underline text-[var(--foreground)] hover:border-violet-400/40"
        >
          Voltar ao início
        </Link>
      </main>
    </div>
  );
}
