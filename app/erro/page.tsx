import Link from "next/link";

export default function ErroPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Pagamento não concluído</h1>
      <p className="text-sm text-[var(--muted)]">
        Algo correu mal ou cancelaste o pagamento.
      </p>
      <Link
        href="/compra"
        className="text-sm font-medium text-[var(--accent)] underline"
      >
        Tentar novamente
      </Link>
    </div>
  );
}
