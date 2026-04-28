import { DarkAppHeader } from "@/components/DarkAppHeader";
import { VideoDeliveryDownloadButton } from "@/components/generations/VideoDeliveryDownloadButton";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ClosedSessionRow = {
  id: string;
  status: string;
  closed_at: string | null;
  video_url: string | null;
  created_at: string;
};

export default async function PedidosFinalizadosPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="min-h-screen bg-black pt-[104px] text-zinc-100">
        <DarkAppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-zinc-500">
            Supabase não configurado.
          </p>
        </main>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/pedidos");

  const { data: rows, error } = await supabase
    .from("support_sessions")
    .select("id, status, closed_at, video_url, created_at")
    .eq("user_id", user.id)
    .eq("status", "closed")
    .order("closed_at", { ascending: false, nullsFirst: false });

  const list = (rows ?? []) as ClosedSessionRow[];

  return (
    <div className="min-h-screen bg-black pt-[104px] text-zinc-100">
      <DarkAppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Histórico
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pedidos concluídos pela equipa. Quando o vídeo estiver pronto, o link de
          entrega aparece aqui — toque em 💎 Baixar meu Vídeo para abrir.
        </p>

        {error ? (
          <p className="mt-8 text-sm text-red-400/90">{error.message}</p>
        ) : list.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">
            Ainda não tem itens no histórico. Quando a equipa finalizar o seu
            pedido no admin, a sessão fica fechada e aparece aqui com o link do
            vídeo (coluna video_url), se foi enviado.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {list.map((s) => {
              const video =
                typeof s.video_url === "string" && s.video_url.trim().length > 0
                  ? s.video_url.trim()
                  : null;
              const when =
                s.closed_at != null && String(s.closed_at) !== ""
                  ? new Date(s.closed_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : new Date(s.created_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    });
              return (
                <li
                  key={s.id}
                  className="rounded-2xl border border-zinc-700/80 bg-zinc-900/80 p-4 shadow-[0_0_32px_-18px_rgba(59,130,246,0.2)]"
                >
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Atendimento finalizado
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-violet-200/90">
                        {s.id.slice(0, 8)}…
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Fechado · {when}</p>
                      <Link
                        href={`/suporte?session=${encodeURIComponent(s.id)}`}
                        className="mt-2 inline-block text-xs font-medium text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
                      >
                        Abrir chat desta sessão
                      </Link>
                    </div>
                    {video ? (
                      <div className="w-full max-w-md">
                        <VideoDeliveryDownloadButton href={video} />
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        Link de vídeo ainda não disponível.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
