"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "miragem_age_gate_v1";

export function AgeGateModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const ok = localStorage.getItem(STORAGE_KEY) === "1";
      setOpen(!ok);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Aviso de conteúdo +18"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[rgba(255,191,0,0.25)] bg-[rgba(15,6,20,0.96)] shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
        <div className="p-6 sm:p-7">
          <h2 className="text-xl font-semibold tracking-tight text-amber-200">
            Aviso de conteúdo +18
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[rgba(232,224,240,0.82)]">
            Este site contém conteúdo adulto. É estritamente proibido qualquer
            conteúdo envolvendo menores de idade (mesmo que pareça fictício).
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[rgba(232,224,240,0.82)]">
            Ao prosseguir, você declara ser maior de 18 anos e concorda em não
            enviar, solicitar ou compartilhar conteúdo ilegal.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[rgba(232,224,240,0.82)]">
            Direitos autorais e imagem: é proibido usar a imagem de terceiros
            sem autorização. Você é responsável pelo conteúdo enviado e pelo uso
            de qualquer material protegido.
          </p>

          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-black transition hover:opacity-95"
            onClick={() => {
              try {
                localStorage.setItem(STORAGE_KEY, "1");
              } catch {}
              setOpen(false);
            }}
          >
            Sou Maior de Idade e Aceito os Termos
          </button>
          <p className="mt-3 text-center text-[11px] text-[rgba(232,224,240,0.6)]">
            Se você não concorda, feche esta página.
          </p>
        </div>
      </div>
    </div>
  );
}

