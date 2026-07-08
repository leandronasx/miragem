"use client";

import { DarkAppHeader } from "@/components/DarkAppHeader";
import { useDiamondsStore } from "@/lib/stores/useDiamondsStore";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { CheckCircle2, Gem, LoaderCircle, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export function SuccessClient() {
  const searchParams = useSearchParams();
  const diamonds = useDiamondsStore((s) => s.diamonds);
  const loadDiamonds = useDiamondsStore((s) => s.loadDiamonds);

  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<"approved" | "pending" | "unknown">("pending");
  const [diamondsCredited, setDiamondsCredited] = useState<number>(0);
  const [message, setMessage] = useState("Processando pagamento…");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const paymentId = useMemo(() => searchParams.get("payment_id") ?? "", [searchParams]);
  const preferenceId = useMemo(() => searchParams.get("preference_id") ?? "", [searchParams]);
  const merchantOrderId = useMemo(() => searchParams.get("merchant_order_id") ?? "", [searchParams]);
  
  const displayRef = paymentId || merchantOrderId || preferenceId || "";

  // Carregar e monitorar a sessão do usuário
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
        void loadDiamonds(data.user.email);
      }
    });
  }, [loadDiamonds]);

  // Verificar status no backend
  useEffect(() => {
    if (!paymentId) {
      setChecking(false);
      setStatus("unknown");
      setMessage("Pagamento concluído. Se comprou diamantes, o saldo pode levar alguns instantes para aparecer.");
      return;
    }

    let isMounted = true;
    let checkCount = 0;
    let timeoutId: NodeJS.Timeout;

    const verify = async () => {
      try {
        const res = await fetch(`/api/checkout/status?payment_id=${paymentId}`);
        if (!res.ok) throw new Error("Erro na verificação");
        
        const data = await res.json();
        if (!isMounted) return;

        if (data.status === "approved") {
          setStatus("approved");
          setDiamondsCredited(data.diamondsCredited || 0);
          setMessage(`Pagamento confirmado! ${data.diamondsCredited || "Os"} diamantes já estão na sua carteira.`);
          setChecking(false);

          // Recarregar os diamantes da store
          if (userEmail) {
            await loadDiamonds(userEmail);
          } else {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.email) {
              setUserEmail(userData.user.email);
              await loadDiamonds(userData.user.email);
            }
          }
        } else {
          // Se ainda não estiver aprovado, tentar novamente algumas vezes (polling leve)
          checkCount += 1;
          if (checkCount < 6) {
            timeoutId = setTimeout(verify, 3000);
          } else {
            setChecking(false);
            setStatus("pending");
            setMessage("Pagamento em processamento. Os diamantes serão creditados assim que a transação for concluída pelo banco.");
          }
        }
      } catch (err) {
        console.error("[success-check] error:", err);
        if (isMounted) {
          setChecking(false);
          setStatus("unknown");
          setMessage("Pagamento concluído. O saldo de diamantes será atualizado em instantes.");
        }
      }
    };

    void verify();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [paymentId, userEmail, loadDiamonds]);

  return (
    <div className="min-h-screen bg-[#0f0614] pt-[104px] text-[#e8e0f0] overflow-hidden relative">
      {/* Background Decorative Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,112,219,0.12),transparent)]" aria-hidden />

      <DarkAppHeader />
      
      <main className="mx-auto max-w-md px-4 py-16 text-center sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-[rgba(25,12,38,0.75)] backdrop-blur-lg border border-[rgba(147,112,219,0.18)] rounded-3xl p-8 shadow-[0_0_50px_-15px_rgba(147,112,219,0.25)]"
        >
          {checking ? (
            <div className="flex flex-col items-center py-6">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-purple-950/40 border border-purple-500/20 mb-6">
                <LoaderCircle className="h-8 w-8 text-purple-400 animate-spin" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mb-2">
                Processando informações
              </h1>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Confirmando dados do pagamento com o Mercado Pago...
              </p>
            </div>
          ) : status === "approved" ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/30 mb-6 text-emerald-400">
                <CheckCircle2 className="h-9 w-9 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
              </div>

              <h1 className="text-xl font-bold tracking-tight text-white mb-2">
                Obrigado!
              </h1>
              
              <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                Os seus diamantes já estão na sua carteira prontos para você usar.
              </p>

              {diamondsCredited > 0 && (
                <div className="flex items-center justify-center gap-1.5 mb-6 px-4 py-2 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl">
                  <Gem className="h-5 w-5 text-emerald-300 animate-bounce" />
                  <span className="text-md font-bold text-emerald-300 tabular-nums">
                    +{diamondsCredited} diamantes
                  </span>
                </div>
              )}

              {displayRef ? (
                <p className="text-xs text-[var(--muted)] mb-6">
                  Referência:{" "}
                  <span className="font-mono tabular-nums text-purple-300">
                    {displayRef}
                  </span>
                </p>
              ) : null}

              <div className="flex items-center justify-center gap-1.5 mb-8 text-sm text-[var(--muted)]">
                <span>Saldo atual:</span>
                <span className="font-semibold text-white tabular-nums">
                  💎 {diamonds}
                </span>
              </div>

              <div className="w-full flex flex-col gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.5)] transition-all duration-300 w-full justify-center active:scale-95 hover:border-emerald-300"
                >
                  Começar a usar agora
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/carteira"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-all duration-300 w-full justify-center hover:text-white"
                >
                  <Wallet className="h-4 w-4 text-zinc-400" />
                  Ver carteira
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-950/40 border border-purple-500/20 mb-6 text-purple-300 animate-pulse">
                <Gem className="h-8 w-8" />
              </div>

              <h1 className="text-xl font-bold tracking-tight text-white mb-2">
                Pagamento Concluído!
              </h1>
              
              <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
                {message}
              </p>

              {displayRef ? (
                <p className="text-xs text-[var(--muted)] mb-8">
                  Referência:{" "}
                  <span className="font-mono tabular-nums text-purple-300">
                    {displayRef}
                  </span>
                </p>
              ) : null}

              <div className="w-full flex flex-col gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-glow)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-violet-400/40 transition-all duration-300 w-full active:scale-95"
                >
                  Voltar ao início
                </Link>
                <Link
                  href="/carteira"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-black/45 px-6 py-3 text-sm font-semibold text-[var(--muted)] hover:text-white transition-all duration-300 w-full active:scale-95"
                >
                  Ir para a carteira
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
