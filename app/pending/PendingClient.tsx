"use client";

import { DarkAppHeader } from "@/components/DarkAppHeader";
import { useDiamondsStore } from "@/lib/stores/useDiamondsStore";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { CheckCircle2, Clock, Gem, AlertCircle, LoaderCircle, Coins, ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PendingClient() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id") ?? "";
  const preferenceId = searchParams.get("preference_id") ?? "";

  const diamonds = useDiamondsStore((s) => s.diamonds);
  const loadDiamonds = useDiamondsStore((s) => s.loadDiamonds);

  const [status, setStatus] = useState<"checking" | "pending" | "approved" | "error" | "no_id">("checking");
  const [diamondsCredited, setDiamondsCredited] = useState<number>(0);
  const [checking, setChecking] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("Verificando status do pagamento...");
  const pollCountRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Obter e atualizar a sessão do usuário
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
        void loadDiamonds(data.user.email);
      }
    });
  }, [loadDiamonds]);

  const checkPaymentStatus = useCallback(async (isManual: boolean = false) => {
    if (!paymentId) {
      setStatus("no_id");
      return;
    }

    if (isManual) {
      setChecking(true);
    }

    try {
      const res = await fetch(`/api/checkout/status?payment_id=${paymentId}`);
      if (!res.ok) {
        throw new Error("Erro ao verificar pagamento");
      }
      const data = await res.json();
      
      if (data.status === "approved") {
        setStatus("approved");
        setDiamondsCredited(data.diamondsCredited || 0);
        setMessage(data.message);
        
        // Atualizar saldo de diamantes na store
        if (userEmail) {
          await loadDiamonds(userEmail);
        } else {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.email) {
            setUserEmail(userData.user.email);
            await loadDiamonds(userData.user.email);
          }
        }

        // Parar o polling de verificação
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        setStatus("pending");
        if (isManual) {
          setMessage("Ainda não detectamos o pagamento. Se você já pagou, aguarde mais alguns instantes ou clique em verificar novamente.");
        } else {
          setMessage("Aguardando confirmação do pagamento via Pix pelo banco...");
        }
      }
    } catch (err) {
      console.error("[checkPaymentStatus] error:", err);
      if (isManual) {
        setMessage("Falha ao comunicar com o servidor. Tente novamente.");
      }
    } finally {
      if (isManual) {
        setChecking(false);
      }
    }
  }, [paymentId, userEmail, loadDiamonds]);

  // Configurar polling automático
  useEffect(() => {
    if (!paymentId) {
      setStatus("no_id");
      return;
    }

    // Primeira verificação imediata
    void checkPaymentStatus(false);

    // Verifica a cada 4 segundos por até 5 minutos (75 iterações)
    pollIntervalRef.current = setInterval(() => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= 75) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        void checkPaymentStatus(false);
      }
    }, 4000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [paymentId, checkPaymentStatus]);

  // Função disparada ao clicar no botão manual
  const handleManualCheck = () => {
    void checkPaymentStatus(true);
  };

  return (
    <div className="relative min-h-screen bg-[#0f0614] pt-[104px] text-[#e8e0f0] overflow-hidden">
      {/* Background Decorative Orbs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,112,219,0.15),transparent)]" aria-hidden />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[120px]" aria-hidden />

      <DarkAppHeader />

      <main className="relative z-10 mx-auto max-w-md px-4 py-16 sm:px-6">
        <AnimatePresence mode="wait">
          {status === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center text-center bg-[rgba(25,12,38,0.7)] backdrop-blur-md border border-[rgba(147,112,219,0.15)] rounded-3xl p-8 shadow-[0_0_50px_-15px_rgba(147,112,219,0.25)]"
            >
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-purple-950/40 border border-purple-500/20 mb-6">
                <LoaderCircle className="h-10 w-10 text-purple-400 animate-spin" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mb-2">
                Verificando transação
              </h1>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {message}
              </p>
            </motion.div>
          )}

          {status === "no_id" && (
            <motion.div
              key="no_id"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center text-center bg-[rgba(25,12,38,0.7)] backdrop-blur-md border border-[rgba(147,112,219,0.15)] rounded-3xl p-8 shadow-[0_0_50px_-15px_rgba(147,112,219,0.25)]"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-950/40 border border-amber-500/20 mb-6 text-amber-400">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mb-2">
                Nenhum pagamento identificado
              </h1>
              <p className="text-sm text-[var(--muted)] leading-relaxed mb-8">
                Não localizamos nenhuma referência de pagamento na URL para verificação em tempo real. Por favor, acesse a sua carteira para ver o histórico.
              </p>
              <Link
                href="/carteira"
                className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/20 px-6 py-3 text-sm font-medium text-violet-200 hover:bg-violet-950/40 transition-all duration-300 w-full justify-center"
              >
                <Wallet className="h-4 w-4" />
                Ir para a carteira
              </Link>
              <Link
                href="/"
                className="mt-4 text-xs text-[var(--muted)] hover:text-white transition-colors duration-200"
              >
                Voltar ao início
              </Link>
            </motion.div>
          )}

          {status === "pending" && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center text-center bg-[rgba(25,12,38,0.7)] backdrop-blur-md border border-[rgba(147,112,219,0.15)] rounded-3xl p-8 shadow-[0_0_50px_-15px_rgba(147,112,219,0.25)]"
            >
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-ping opacity-75" />
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-950/50 border border-purple-500/30 relative">
                  <Clock className="h-8 w-8 text-purple-300 animate-pulse" />
                </div>
              </div>

              <h1 className="text-xl font-bold tracking-tight text-white mb-2">
                Aguardando pagamento Pix
              </h1>
              
              <div className="px-3 py-1 bg-purple-900/30 border border-purple-500/20 rounded-full mb-6">
                <span className="text-xs font-semibold text-purple-200 tabular-nums uppercase tracking-wider">
                  Código MP: {paymentId}
                </span>
              </div>

              <p className="text-sm text-[var(--muted)] leading-relaxed mb-8">
                {message}
              </p>

              <button
                type="button"
                disabled={checking}
                onClick={handleManualCheck}
                className="relative inline-flex items-center gap-2 rounded-full border border-violet-400 bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(147,112,219,0.4)] hover:shadow-[0_4px_25px_rgba(147,112,219,0.6)] disabled:opacity-50 transition-all duration-300 w-full justify-center active:scale-95"
              >
                {checking ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Verificando saldo...
                  </>
                ) : (
                  <>
                    Já fiz o pagamento
                  </>
                )}
              </button>

              <p className="mt-4 text-[11px] text-[var(--muted)]">
                A verificação é automática a cada 4 segundos. Não feche esta janela.
              </p>
              
              <Link
                href="/carteira"
                className="mt-6 text-xs font-medium text-violet-300 underline underline-offset-4 hover:text-violet-200"
              >
                Ir para a carteira sem esperar
              </Link>
            </motion.div>
          )}

          {status === "approved" && (
            <motion.div
              key="approved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="flex flex-col items-center text-center bg-[rgba(25,12,38,0.85)] backdrop-blur-lg border border-emerald-500/25 rounded-3xl p-8 shadow-[0_0_60px_-15px_rgba(16,185,129,0.25)] relative overflow-hidden"
            >
              {/* Success Ambient Light */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[48px]" />

              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-950/40 border border-emerald-500/30 mb-6 text-emerald-400 relative z-10">
                <CheckCircle2 className="h-10 w-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white mb-2 relative z-10">
                Pagamento Aprovado!
              </h1>

              <div className="flex items-center justify-center gap-1.5 mt-3 mb-6 px-4 py-2 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl">
                <Gem className="h-5 w-5 text-emerald-300 animate-bounce" />
                <span className="text-lg font-bold text-emerald-300 tabular-nums">
                  +{diamondsCredited} diamantes
                </span>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed mb-8 px-2">
                Os seus diamantes já estão na sua carteira prontos para usar! O seu saldo atualizado é de <strong className="text-white font-semibold tabular-nums">💎 {diamonds}</strong>.
              </p>

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
                  Ver histórico na carteira
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
