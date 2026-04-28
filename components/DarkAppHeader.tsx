"use client";

import { recordMyLoginAction } from "@/app/actions/login-tracker";
import { AppNav } from "@/components/AppNav";
import { isStaff } from "@/lib/auth/staff";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useDiamondsStore } from "@/lib/stores/useDiamondsStore";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function DarkAppHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [chromeHidden, setChromeHidden] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const diamonds = useDiamondsStore((s) => s.diamonds);
  const loadDiamonds = useDiamondsStore((s) => s.loadDiamonds);
  const resetDiamonds = useDiamondsStore((s) => s.reset);
  const lastScrollYRef = useRef(0);

  const refreshUser = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      return;
    }
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    void refreshUser();
    if (!isSupabaseConfigured()) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e: AuthChangeEvent, session: Session | null) => {
      const next = session?.user ?? null;
      setUser(next);
      const em = next?.email?.trim();
      if (em) void loadDiamonds(em);
      else resetDiamonds();
    });
    return () => subscription.unsubscribe();
  }, [refreshUser, loadDiamonds, resetDiamonds]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const em = user?.email?.trim();
    if (em) void loadDiamonds(em);
    else resetDiamonds();
  }, [user?.email, loadDiamonds, resetDiamonds]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !user?.id) return;
    if (typeof window === "undefined") return;
    const key = "mirage_login_ping_v1";
    if (sessionStorage.getItem(key)) return;
    void recordMyLoginAction().then((r) => {
      if (r.ok) sessionStorage.setItem(key, "1");
    });
  }, [user?.id]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // Header inteligente no mobile: esconde ao descer, mostra ao subir.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = () => window.innerWidth < 640; // < sm
    lastScrollYRef.current = window.scrollY || 0;

    const onScroll = () => {
      if (!isMobile()) {
        if (chromeHidden) setChromeHidden(false);
        lastScrollYRef.current = window.scrollY || 0;
        return;
      }
      const y = window.scrollY || 0;
      const last = lastScrollYRef.current;
      const delta = y - last;

      // evita “tremido” no topo
      if (y < 8) {
        setChromeHidden(false);
        lastScrollYRef.current = y;
        return;
      }

      if (delta > 10) setChromeHidden(true);
      else if (delta < -8) setChromeHidden(false);

      lastScrollYRef.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [chromeHidden]);

  async function signOut() {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    resetDiamonds();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName = user?.email
    ? user.email.split("@")[0] ?? "Conta"
    : "Entrar";

  return (
    <>
      <div
        className={`fixed left-0 right-0 top-0 z-20 transition-transform duration-300 will-change-transform ${chromeHidden ? "-translate-y-full" : "translate-y-0"}`}
      >
        <header className="flex items-center gap-3 border-b border-[rgba(147,112,219,0.15)] bg-[rgba(15,6,20,0.9)] px-4 py-3">
          <Link
            href="/"
            className="shrink-0 text-lg font-bold text-[#d4b8f0] no-underline hover:text-[#e8d4ff]"
          >
            Miragem Fantasia
          </Link>

          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
            {user && isSupabaseConfigured() ? (
              <span
                className="text-sm font-medium tabular-nums text-[#e8d4ff]"
                title="Diamantes"
              >
                💎 {diamonds}
              </span>
            ) : null}

            <div className="relative shrink-0">
              {user ? (
                <>
                  <button
                    ref={btnRef}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(147,112,219,0.4)] bg-[rgba(15,10,24,0.8)] px-2.5 py-1.5 text-[#e5e7eb]"
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                    aria-label="Menu do usuário"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((o) => !o);
                    }}
                  >
                    <span className="max-w-[140px] truncate text-sm">
                      {displayName}
                    </span>
                    <span aria-hidden>👤</span>
                  </button>
                  <div
                    ref={menuRef}
                    className={`absolute right-0 top-[120%] z-50 min-w-[190px] rounded-xl border border-[rgba(147,112,219,0.5)] bg-[rgba(15,10,24,0.98)] p-2 shadow-[0_14px_40px_rgba(0,0,0,0.6)] ${menuOpen ? "block" : "hidden"}`}
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-[#e5e7eb] hover:bg-[rgba(147,112,219,0.25)]"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/carteira");
                      }}
                    >
                      Perfil
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-[#e5e7eb] hover:bg-[rgba(147,112,219,0.25)]"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/minhas-geracoes");
                      }}
                    >
                      Minhas Gerações
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-[#e5e7eb] hover:bg-[rgba(147,112,219,0.25)]"
                      onClick={() => void signOut()}
                    >
                      Sair
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  href="/login?next=/"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(147,112,219,0.4)] bg-[rgba(15,10,24,0.8)] px-2.5 py-1.5 text-sm text-[#e5e7eb] no-underline hover:bg-[rgba(147,112,219,0.15)]"
                >
                  Entrar
                  <span aria-hidden>👤</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        <nav
          className="flex flex-wrap items-center gap-2 border-b border-[rgba(147,112,219,0.1)] bg-[rgba(15,6,20,0.85)] px-4 py-3"
          aria-label="Seções"
        >
          <AppNav showAdminTab={isStaff(user)} />
        </nav>
      </div>
    </>
  );
}
