import Link from "next/link";

export default function SucessoPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Pagamento aprovado</h1>
      <p className="text-sm text-[var(--muted)]">
        Obrigado. Podes fechar esta janela ou voltar à app.
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
