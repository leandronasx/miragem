"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

export type DiamondTxRow = {
  id: string;
  user_id: string;
  delta: number;
  type: string;
  created_at: string;
};

type Props = {
  initialTransactions: DiamondTxRow[];
};

export function DiamondTransactionsTab({ initialTransactions }: Props) {
  const [filter, setFilter] = useState<"all" | "refundable">("refundable");
  const [txs] = useState<DiamondTxRow[]>(() => initialTransactions);

  const rows = useMemo(() => {
    if (filter === "all") return txs;
    return txs.filter(() => false);
  }, [filter, txs]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("refundable")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "refundable"
                ? "bg-gradient-to-r from-amber-500 to-amber-300 text-black shadow-lg shadow-amber-900/30"
                : "border border-[rgba(147,112,219,0.25)] bg-black/30 text-violet-200/80 hover:border-violet-400/40 hover:text-violet-100"
            }`}
          >
            Estornáveis
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === "all"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/40"
                : "border border-[rgba(147,112,219,0.25)] bg-black/30 text-violet-200/80 hover:border-violet-400/40 hover:text-violet-100"
            }`}
          >
            Todas
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(147,112,219,0.25)] bg-black/30 px-4 py-2 text-sm font-semibold text-violet-100 hover:border-violet-400/40"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Atualizar
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[rgba(147,112,219,0.25)] bg-black/30 px-4 py-3 text-sm text-[var(--muted)]">
          Nenhuma transação estornável para exibir (schema de estorno ainda não alinhado).
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[rgba(147,112,219,0.22)] bg-black/25">
          <div className="grid grid-cols-12 gap-3 border-b border-[rgba(147,112,219,0.18)] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-violet-200/80">
            <div className="col-span-4 sm:col-span-3">Criado</div>
            <div className="col-span-4 sm:col-span-3">Usuário</div>
            <div className="col-span-4 sm:col-span-4">Tipo</div>
            <div className="hidden sm:col-span-2 sm:block">Δ</div>
          </div>
          <ul className="divide-y divide-[rgba(147,112,219,0.12)]">
            {rows.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 sm:col-span-3 text-xs text-[var(--muted)]">
                    {new Date(t.created_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    <span className="font-mono text-[0.75rem] text-violet-200/90">
                      {t.user_id}
                    </span>
                  </div>
                  <div className="col-span-4 sm:col-span-4">
                    <span className="text-xs text-violet-100">{t.type}</span>
                  </div>
                  <div className="hidden sm:col-span-2 sm:block">
                    <span className="text-xs font-semibold tabular-nums text-violet-100">
                      {Number(t.delta) >= 0 ? "+" : ""}
                      {Number(t.delta).toLocaleString("pt-BR")} 💎
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

