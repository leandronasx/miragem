import Link from "next/link";

export default function PendentePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Pagamento pendente</h1>
      <p className="text-sm text-[var(--muted)]">
        Aguarda a confirmação (ex.: Pix). Atualiza a carteira mais tarde.
      </p>
      <Link
        href="/carteira"
        className="text-sm font-medium text-[var(--accent)] underline"
      >
        Ir para a carteira
      </Link>
    </div>
  );
}
