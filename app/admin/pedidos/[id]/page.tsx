import { isStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPedidoDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isStaff(user)) redirect("/");

  const { data: row, error } = await supabase
    .from("support_sessions")
    .select("id, user_id, status, video_url, created_at, closed_at, model_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-[var(--foreground)]">
        <h1 className="text-xl font-semibold">Sessão</h1>
        <p className="mt-3 text-sm text-red-200/90">
          {error?.message ?? "Sessão não encontrada."}
        </p>
      </main>
    );
  }

  const deliveryUrl =
    typeof row.video_url === "string" && row.video_url.trim().length > 0
      ? row.video_url.trim()
      : "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-[var(--foreground)]">
      <h1 className="text-xl font-semibold">Sessão (ADM)</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Mensagens em{" "}
        <code className="rounded bg-black/30 px-1 text-xs">support_messages</code>
        .{" "}
        <Link
          href={`/suporte?session=${encodeURIComponent(row.id)}`}
          className="font-medium text-violet-300 underline-offset-2 hover:underline"
        >
          Abrir chat (mesma UI do cliente)
        </Link>
        .
      </p>
      <div className="mt-4 rounded-2xl border border-[rgba(147,112,219,0.22)] bg-black/25 p-4">
        <p className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-violet-200/90">ID</span>:{" "}
          <span className="font-mono text-xs text-violet-100">{row.id}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          <span className="font-semibold text-violet-200/90">Usuário</span>:{" "}
          <span className="font-mono text-xs text-violet-100">{row.user_id}</span>
        </p>
        {row.model_id ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            <span className="font-semibold text-violet-200/90">model_id</span>:{" "}
            <span className="font-mono text-xs text-violet-100">{row.model_id}</span>
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--muted)]">
          <span className="font-semibold text-violet-200/90">Status</span>:{" "}
          <span className="font-semibold text-amber-200">{row.status}</span>
        </p>
        {deliveryUrl ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            <span className="font-semibold text-sky-200/90">Entrega (URL)</span>
            :{" "}
            <a
              href={deliveryUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline"
            >
              abrir link
            </a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
