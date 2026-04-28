"use client";

import { DarkAppHeader } from "@/components/DarkAppHeader";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { Loader2, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useCallback, useState } from "react";

/** Ícone oficial Google (cores da marca) — Lucide não inclui logótipos de terceiros. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const err = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  /**
   * OAuth Google: após o fluxo, o Supabase redireciona para `redirectTo` (callback),
   * que troca o código pela sessão e envia o utilizador para `/explore`.
   */
  const signInWithGoogle = useCallback(async () => {
    setFormError(null);
    setInfo(null);
    if (!isSupabaseConfigured()) {
      setFormError("Configure o Supabase no .env.local.");
      return;
    }
    setGoogleLoading(true);
    try {
      const origin = window.location.origin;
      const afterLoginPath = "/explore";
      /** Deve coincidir com uma URL em Authentication → URL Configuration no Supabase. */
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(afterLoginPath)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        setFormError(error.message);
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  async function sendPasswordReset() {
    setForgotError(null);
    setInfo(null);
    if (!isSupabaseConfigured()) {
      setForgotError("Configure o Supabase no .env.local.");
      return;
    }
    const trimmed = resetEmail.trim();
    if (!trimmed) {
      setForgotError("Indique o e-mail da conta.");
      return;
    }
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        setForgotError(error.message);
        return;
      }
      setInfo(
        "Se existir uma conta com este e-mail, você receberá um link para redefinir a senha.",
      );
      setForgotOpen(false);
      setResetEmail("");
    } finally {
      setResetSending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setFormError(null);
    if (!isSupabaseConfigured()) {
      setFormError("Configure o Supabase no .env.local.");
      return;
    }
    if (!email.trim() || !password) return;

    setLoading(true);
    try {
      const origin = window.location.origin;

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setFormError(error.message);
          return;
        }
        router.push(next);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setFormError(error.message);
        return;
      }
      if (data.session) {
        router.push(next);
        router.refresh();
        return;
      }
      setInfo(
        "Conta criada. Se o projeto pedir confirmação de e-mail, abra o link recebido; depois volte aqui para entrar.",
      );
      setMode("login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold text-white">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {mode === "login"
          ? "Use seu e-mail e senha."
          : "Cadastre-se com e-mail e senha."}
      </p>

      {err === "auth" ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Falha na autenticação. Tente novamente.
        </p>
      ) : null}
      {err === "banned" ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Esta conta foi suspensa. Entre em contato com o suporte.
        </p>
      ) : null}

      {!isSupabaseConfigured() ? (
        <p className="mt-6 text-sm text-zinc-500">
          Defina NEXT_PUBLIC_SUPABASE_URL e ANON_KEY.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="space-y-3">
            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={() => void signInWithGoogle()}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-zinc-600/80 bg-zinc-900/90 py-3.5 pl-4 pr-4 text-sm font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] transition hover:border-zinc-500 hover:bg-zinc-800/95 hover:shadow-[0_0_24px_-8px_rgba(66,133,244,0.45)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-zinc-200/10">
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                ) : (
                  <GoogleMark className="h-5 w-5" />
                )}
              </span>
              <span className="text-[0.95rem] tracking-tight">
                Entrar com Google
              </span>
            </button>
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-600">
              ou com e-mail
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs text-zinc-500">E-mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label className="text-xs text-zinc-500">Senha</label>
              {mode === "login" ? (
                <button
                  type="button"
                  className="text-xs text-emerald-400 underline-offset-2 hover:underline"
                  onClick={() => {
                    setForgotOpen(true);
                    setFormError(null);
                    setForgotError(null);
                    setInfo(null);
                  }}
                >
                  Esqueci minha senha
                </button>
              ) : null}
            </div>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {formError ? (
            <p className="text-sm text-red-300">{formError}</p>
          ) : null}
          {info ? (
            <p className="text-sm text-emerald-300/90">{info}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-100 py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
          <p className="text-center text-sm text-zinc-500">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button
                  type="button"
                  className="text-emerald-400 underline-offset-2 hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setInfo(null);
                    setFormError(null);
                  }}
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  className="text-emerald-400 underline-offset-2 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setInfo(null);
                    setFormError(null);
                  }}
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </form>

          {forgotOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-title"
            >
              <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-xl">
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  onClick={() => {
                    setForgotOpen(false);
                    setResetEmail("");
                    setForgotError(null);
                  }}
                  aria-label="Fechar"
                >
                  ✕
                </button>
                <h2
                  id="forgot-title"
                  className="pr-8 text-lg font-semibold text-white"
                >
                  Recuperar senha
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Indique o e-mail da conta. Enviaremos um link para definir uma
                  nova senha.
                </p>
                <div className="mt-4">
                  <label htmlFor="reset-email" className="text-xs text-zinc-500">
                    E-mail
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
                {forgotError ? (
                  <p className="mt-3 text-sm text-red-300">{forgotError}</p>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    onClick={() => {
                      setForgotOpen(false);
                      setResetEmail("");
                      setForgotError(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={resetSending}
                    className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-black hover:bg-white disabled:opacity-50"
                    onClick={() => void sendPasswordReset()}
                  >
                    {resetSending ? "A enviar…" : "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black pt-[104px] text-zinc-100">
      <DarkAppHeader />
      <Suspense
        fallback={
          <p className="px-4 py-16 text-center text-sm text-zinc-500 sm:px-6">
            Carregando…
          </p>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
