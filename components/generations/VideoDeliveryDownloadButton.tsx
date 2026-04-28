/** CTA de entrega do vídeo na área do cliente (pedidos finalizados). */
export function VideoDeliveryDownloadButton({ href }: { href: string }) {
  const safe = href.trim();
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(56,189,248,0.55),0_0_48px_rgba(59,130,246,0.35)] transition hover:brightness-110 hover:shadow-[0_0_36px_rgba(56,189,248,0.65)] sm:w-auto sm:py-2.5"
    >
      💎 Baixar meu Vídeo
    </a>
  );
}
