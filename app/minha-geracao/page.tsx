"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, ArrowLeft, Download, Clock, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DarkAppHeader } from "@/components/DarkAppHeader";

interface Generation {
  id: string;
  user_id: string;
  video_id: string;
  status: string;
  created_at: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
}

function statusConfig(status: string) {
  switch (status) {
    case 'concluido':
    case 'completed':
      return { label: 'Concluído', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
    case 'processando':
    case 'processing':
      return { label: 'Processando', icon: LoaderCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', spin: true };
    case 'falhou':
    case 'failed':
      return { label: 'Falhou', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
    default:
      return { label: 'Pendente', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  }
}

export default function MinhaGeracaoPage() {
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await sb
        .from('generations' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar gerações:', error);
      } else {
        setGenerations((data as unknown as Generation[]) ?? []);
      }
      setLoading(false);

      // Realtime: escutar mudanças nas gerações do usuário
      const channel = sb
        .channel('my-generations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'generations', filter: `user_id=eq.${user.id}` },
          () => {
            // Recarregar tudo ao receber qualquer mudança
            sb.from('generations' as any)
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .then(({ data: fresh }) => {
                if (fresh) setGenerations(fresh as unknown as Generation[]);
              });
          }
        )
        .subscribe();

      return () => { sb.removeChannel(channel); };
    };

    load();
  }, [router]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818]">
        <DarkAppHeader />
        <div className="flex items-center justify-center pt-[200px]">
          <LoaderCircle className="h-10 w-10 animate-spin text-violet-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818] text-[#e8e0f0]">
      {/* Fundo decorativo */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(147,112,219,0.18), transparent),
            radial-gradient(ellipse 60% 80% at 100% 50%, rgba(138,43,226,0.10), transparent),
            linear-gradient(180deg, #0f0614 0%, #1a0a24 30%, #120818 100%)`,
        }}
        aria-hidden
      />

      <DarkAppHeader />

      <main className="mx-auto max-w-5xl px-4 pt-[132px] pb-20 sm:pt-[110px]">
        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(147,112,219,0.25)] bg-[rgba(15,10,24,0.6)] px-3 py-1.5 text-sm text-zinc-400 backdrop-blur transition hover:border-violet-500/50 hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Minhas Gerações
          </h1>
        </div>

        {/* Lista vazia */}
        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[rgba(147,112,219,0.2)] bg-[rgba(15,10,24,0.5)] px-6 py-20 text-center backdrop-blur-md">
            <Sparkles className="mb-4 h-12 w-12 text-violet-400/60" />
            <h2 className="mb-2 text-lg font-semibold text-white">Nenhuma geração ainda</h2>
            <p className="mb-6 max-w-sm text-sm text-zinc-400">
              Escolha um vídeo na página inicial e clique em <strong className="text-violet-300">Gerar</strong> para solicitar a sua primeira geração!
            </p>
            <Link
              href="/"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-medium text-white transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              Explorar Vídeos
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {generations.map((gen) => {
              const cfg = statusConfig(gen.status);
              const StatusIcon = cfg.icon;
              const isPending = gen.status === 'pendente' || gen.status === 'pending';
              const isCompleted = gen.status === 'concluido' || gen.status === 'completed';

              return (
                <div
                  key={gen.id}
                  className="group relative overflow-hidden rounded-2xl border border-[rgba(147,112,219,0.2)] bg-[rgba(15,10,24,0.55)] backdrop-blur-md transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_0_30px_rgba(147,112,219,0.12)]"
                >
                  {/* Preview area */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                    {isCompleted && gen.video_url ? (
                      <video
                        src={gen.video_url}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        autoPlay
                        controls
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
                        {isPending ? (
                          <>
                            <div className="relative">
                              <div className="h-16 w-16 animate-pulse rounded-full border-2 border-violet-500/40 bg-violet-500/10" />
                              <LoaderCircle className="absolute inset-0 m-auto h-8 w-8 animate-spin text-violet-400" />
                            </div>
                            <p className="text-center text-sm font-medium text-violet-200">
                              Seu vídeo está sendo preparado pelos nossos editores!
                            </p>
                            <p className="text-center text-xs text-zinc-500">
                              Fique tranquilo, avisaremos quando estiver pronto.
                            </p>
                          </>
                        ) : (
                          <>
                            <StatusIcon className={`h-8 w-8 ${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`} />
                            <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-3 p-4">
                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className={`h-3 w-3 ${cfg.spin ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(gen.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Download */}
                    {isCompleted && gen.video_url && (
                      <a
                        href={gen.video_url}
                        download
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:from-green-600 hover:to-emerald-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar Vídeo
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(147,112,219,0.1)] bg-[rgba(15,6,20,0.8)] py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Miragem Fantasia. Todos os direitos reservados.
      </footer>
    </div>
  );
}
