"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

export function ResetPasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setChecking(false);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!isSupabaseConfigured()) {
      setError("Configure o Supabase no .env.local.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setInfo("Senha atualizada. A redirecionar…");
      setTimeout(() => {
        router.push("/explore");
        router.refresh();
      }, 800);
    } finally {
      setLoading(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <p className="mx-auto max-w-md px-4 py-16 text-sm text-zinc-500 sm:px-6">
        Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </p>
    );
  }

  if (checking) {
    return (
      <p className="mx-auto max-w-md px-4 py-16 text-center text-sm text-zinc-500 sm:px-6">
        Carregando…
      </p>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <p className="text-sm text-zinc-400">
          Abra o link enviado por e-mail para esta página. Se o link expirou,
          solicite um novo em &quot;Esqueci minha senha&quot; no login.
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold text-white">Nova senha</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Escolha uma nova senha para a sua conta.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="new-password" className="text-xs text-zinc-500">
            Nova senha
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-300/90">{info}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-100 py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Guardar nova senha
        </button>
      </form>
    </main>
  );
}
