import { VideoDeliveryDownloadButton } from "@/components/generations/VideoDeliveryDownloadButton";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PedidoDetailsPage({
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
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/pedidos/${id}`)}`);
  }

  const { data: row, error } = await supabase
    .from("support_sessions")
    .select("id, user_id, status, video_url, created_at, closed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-[var(--foreground)]">
        <h1 className="text-xl font-semibold">Pedido</h1>
        <p className="mt-3 text-sm text-red-200/90">
          {error?.message ?? "Sessão não encontrada."}
        </p>
      </main>
    );
  }

  const deliveryUrl =
    typeof row.video_url === "string" && row.video_url.trim().length > 0
      ? row.video_url.trim()
      : null;
  const showDelivery =
    String(row.status) === "closed" && deliveryUrl != null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-[var(--foreground)]">
      <p className="text-sm text-[var(--muted)]">
        <Link
          href="/pedidos"
          className="text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
        >
          ← Pedidos finalizados
        </Link>
      </p>
      <h1 className="mt-2 text-xl font-semibold">Sessão de suporte</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        O chat desta sessão usa apenas{" "}
        <code className="rounded bg-black/30 px-1 text-xs">support_messages</code>
        .{" "}
        <Link
          href={`/suporte?session=${encodeURIComponent(row.id)}`}
          className="font-medium text-violet-300 underline-offset-2 hover:underline"
        >
          Abrir chat
        </Link>
        .
      </p>
      <div className="mt-4 rounded-2xl border border-[rgba(147,112,219,0.22)] bg-black/25 p-4">
        <p className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-violet-200/90">ID</span>:{" "}
          <span className="font-mono text-xs text-violet-100">{row.id}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          <span className="font-semibold text-violet-200/90">Status</span>:{" "}
          <span className="font-semibold text-amber-200">{row.status}</span>
        </p>
        {showDelivery ? (
          <div className="mt-4 border-t border-[rgba(147,112,219,0.15)] pt-4">
            <p className="text-xs font-medium text-sky-200/90">
              O seu vídeo está pronto.
            </p>
            <div className="mt-3">
              <VideoDeliveryDownloadButton href={deliveryUrl} />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
