"use client";

import type { EconomyUserRow } from "@/app/admin/actions";
import { adminAdjustDiamondsWithTransactionAction } from "@/app/admin/actions";
import { LoaderCircle, Search, UserCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

export function AdminUsersEconomyClient({
  initialUsers,
}: {
  initialUsers: EconomyUserRow[];
}) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [delta, setDelta] = useState("10");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return initialUsers;
    return initialUsers.filter((u) => u.email.toLowerCase().includes(s));
  }, [initialUsers, q]);

  const selected = useMemo(
    () => initialUsers.find((u) => u.id === selectedId) ?? null,
    [initialUsers, selectedId],
  );

  const onAdjust = async () => {
    if (!selected) return;
    setMsg(null);
    const d = Math.trunc(Number(delta));
    if (!Number.isFinite(d) || d <= 0) {
      setMsg("Informe um inteiro > 0.");
      return;
    }
    setBusy(true);
    try {
      const res = await adminAdjustDiamondsWithTransactionAction(selected.id, d);
      console.log("[admin][economy] adjust response:", res);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      // Atualiza localmente (lista é estática); recarregar página para refletir em toda UI
      setMsg(`Diamantes atualizados: ${res.newDiamonds}`);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-[rgba(147,112,219,0.18)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-violet-200/70" />
            <input
              className="w-full rounded-xl border border-[rgba(147,112,219,0.25)] bg-black/40 py-2 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none ring-violet-500/20 focus:ring-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por e-mail…"
            />
          </div>
          <span className="text-xs text-[var(--muted)]">
            {filtered.length}/{initialUsers.length}
          </span>
        </div>

        <div className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-[rgba(147,112,219,0.14)] bg-black/20">
          {filtered.map((u) => {
            const active = u.id === selectedId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedId(u.id)}
                className={`flex w-full items-center justify-between gap-3 border-b border-[rgba(147,112,219,0.1)] px-4 py-3 text-left text-sm hover:bg-white/5 ${active ? "bg-white/5" : ""}`}
              >
                <span className="min-w-0 truncate text-[var(--foreground)]">
                  {u.email}
                </span>
                <span className="shrink-0 rounded-full border border-[rgba(147,112,219,0.25)] bg-black/30 px-2.5 py-0.5 text-xs tabular-nums text-violet-200/80">
                  {u.diamonds.toLocaleString("pt-BR")} 💎
                </span>
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">
              Nenhum utilizador encontrado.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[rgba(147,112,219,0.18)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-violet-200/80" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Utilizador
          </h2>
        </div>

        {selected ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[rgba(147,112,219,0.2)] bg-black/25 p-3">
              <p className="truncate text-sm text-[var(--foreground)]">
                {selected.email}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Saldo atual (Diamantes):{" "}
                <span className="font-semibold tabular-nums text-violet-200/90">
                  {selected.diamonds.toLocaleString("pt-BR")} 💎
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs text-[var(--muted)]">
                Quantidade a adicionar
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-[rgba(147,112,219,0.25)] bg-black/40 px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-violet-500/20 focus:ring-2"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                inputMode="numeric"
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Isto cria um registo em <code>diamond_transactions</code> com
                tipo <code>admin_adjustment</code>.
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void onAdjust()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Adicionar Diamantes
            </button>

            {msg ? (
              <p className="text-sm text-violet-200/90" role="status">
                {msg}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Selecione um utilizador na lista.
          </p>
        )}
      </section>
    </div>
  );
}

