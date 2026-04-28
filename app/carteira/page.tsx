import { DarkAppHeader } from "@/components/DarkAppHeader";
import { formatDiamondBalanceDisplay } from "@/lib/formatDiamonds";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type DiamondTxRow = Pick<
  Tables<"diamond_transactions">,
  "id" | "delta" | "type" | "created_at"
>;

export default async function CarteiraPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="min-h-screen bg-black pt-[104px] text-zinc-100">
        <DarkAppHeader />
        <main className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-zinc-500">
            Supabase não configurado.
          </p>
        </main>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/carteira");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("diamonds, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: dtxs, error: dtxError } = await supabase
    .from("diamond_transactions")
    .select("id, delta, type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  const diamonds = Math.trunc(Number(profile?.diamonds ?? 0));
  const transactions = (dtxs ?? []) as DiamondTxRow[];

  return (
    <div className="min-h-screen bg-black pt-[104px] text-zinc-100">
      <DarkAppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Carteira
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Saldo em diamantes e histórico de movimentações.
        </p>

        {profileError ? (
          <p className="mt-8 text-sm text-red-400/90">{profileError.message}</p>
        ) : (
          <section className="mt-8 rounded-2xl border border-zinc-700/80 bg-zinc-900 p-6 shadow-[0_0_40px_-16px_rgba(245,158,11,0.2)]">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Saldo disponível
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
              {formatDiamondBalanceDisplay(diamonds)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">Diamantes</p>
            {profile?.display_name ? (
              <p className="mt-2 text-xs text-zinc-500">
                {profile.display_name}
              </p>
            ) : null}
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-300">
            Histórico de diamantes
          </h2>
          {dtxError ? (
            <p className="mt-4 text-sm text-red-400/90">{dtxError.message}</p>
          ) : transactions.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Nenhuma movimentação de diamantes registada ainda.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/50">
              {transactions.map((t) => {
                const d = Math.trunc(Number(t.delta ?? 0));
                const signed =
                  d >= 0 ? `+${d.toLocaleString("pt-BR")}` : d.toLocaleString("pt-BR");
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-zinc-200">{t.type}</p>
                      <p className="text-[11px] text-zinc-600">
                        {new Date(t.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <span
                      className={`tabular-nums font-medium ${
                        d >= 0 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {signed} 💎
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
