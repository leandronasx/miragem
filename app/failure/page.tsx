import Link from "next/link";

export default function FailurePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Pagamento não concluído</h1>
      <p className="text-sm text-[var(--muted)]">
        O pagamento falhou ou foi cancelado.
      </p>
      <Link
        href="/compra"
        className="text-sm font-medium text-[var(--accent)] underline"
      >
        Voltar à compra
      </Link>
    </div>
  );
}
