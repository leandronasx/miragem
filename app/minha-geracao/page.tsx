"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, ArrowLeft, Download, Play } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { DarkAppHeader } from "@/components/DarkAppHeader";

interface GenerationSession {
  id: string;
  user_id: string;
  video_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  diamond_cost: number;
  created_at: string;
  updated_at: string;
  video_url?: string;
  thumbnail_url?: string;
}

function MinhaGeracaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndSession = async () => {
      try {
        const sb = createClient();
        
        // Buscar usuário atual
        const { data: { user } } = await sb.auth.getUser();
        setUser(user);

        if (!user) {
          router.push('/login');
          return;
        }

        if (!sessionId) {
          setError('Sessão não encontrada');
          setLoading(false);
          return;
        }

        // Buscar dados da sessão de geração
        const { data: sessionData, error: sessionError } = await sb
          .from('generations' as any)
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (sessionError) {
          console.error('Erro ao buscar sessão:', sessionError);
          setError('Sessão não encontrada');
          setLoading(false);
          return;
        }

        setSession(sessionData as unknown as GenerationSession);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSession();
  }, [router, sessionId]);

  // Setup real-time updates
  useEffect(() => {
    if (!session || !user) return;

    const sb = createClient();
    
    const channel = sb
      .channel(`generation-${session.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'generations',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          console.log('Atualização em tempo real:', payload.new);
          setSession(payload.new as GenerationSession);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [session, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818] flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-violet-400 mx-auto" />
            <div className="absolute inset-0 h-12 w-12 animate-ping bg-violet-400/20 rounded-full" />
          </div>
          <p className="text-zinc-300">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818] flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 mb-4">
            <p className="text-red-300">{error}</p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818]">
      <DarkAppHeader />
      
      <main className="container mx-auto px-4 pt-[132px] sm:pt-[104px] py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-300 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
              <h1 className="text-2xl font-bold text-white">Minha Geração</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                session?.status === 'completed' 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                  : session?.status === 'processing'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                  : session?.status === 'failed'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
              }`}>
                {session?.status === 'pending' && 'Pendente'}
                {session?.status === 'processing' && 'Processando'}
                {session?.status === 'completed' && 'Concluído'}
                {session?.status === 'failed' && 'Falhou'}
              </span>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Lado Esquerdo - Preview */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
              <div className="aspect-[9/16] w-full overflow-hidden rounded-xl border border-[rgba(147,112,219,0.3)] bg-black">
                {session && session.status === 'completed' && session.video_url ? (
                  // Vídeo pronto - mostrar player
                  <video
                    src={session.video_url}
                    className="h-full w-full object-cover"
                    controls
                    muted
                    loop
                    playsInline
                    autoPlay
                    poster={session.thumbnail_url}
                  />
                ) : session ? (
                  // Imagem com blur para pending/processing + loading animation
                  <div className="relative h-full w-full">
                    {session.thumbnail_url && (
                      <Image
                        src={session.thumbnail_url}
                        alt="Preview da geração"
                        fill
                        className="object-cover blur-xl"
                        onError={() => setError('Erro ao carregar imagem')}
                      />
                    )}
                    
                    {/* Overlay de loading */}
                    {(session.status === 'pending' || session.status === 'processing') && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                        <div className="relative">
                          <LoaderCircle className="h-14 w-14 animate-spin text-violet-400 mb-4" />
                          <div className="absolute inset-0 h-14 w-14 animate-ping bg-violet-400/20 rounded-full" />
                          <div className="absolute inset-0 h-14 w-14 animate-pulse border-2 border-violet-400/50 rounded-full" />
                        </div>
                        
                        <div className="text-center">
                          <p className="text-white font-medium mb-2">
                            {session.status === 'pending' ? 'Aguardando processamento' : 'Processando seu vídeo...'}
                          </p>
                          <p className="text-zinc-300 text-sm">
                            {session.status === 'pending' 
                              ? 'Sua geração está na fila e será processada em breve'
                              : 'Nossa IA está trabalhando na sua geração'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Status de falha */}
                    {session.status === 'failed' && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <div className="text-center">
                          <p className="text-red-300 font-medium mb-4">
                            Falha na geração
                          </p>
                          <p className="text-zinc-300 text-sm mb-4">
                            Ocorreu um erro ao processar sua geração. Tente novamente.
                          </p>
                          <Link 
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Tentar Novamente
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Lado Direito - Informações */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Informações</h2>
              <div className="bg-black/40 border border-[rgba(147,112,219,0.3)] rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">ID da Sessão</p>
                  <p className="text-white font-mono">{session?.id}</p>
                </div>
                
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Custo em Diamantes</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-violet-400">💎 {session?.diamond_cost}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Data de Criação</p>
                  <p className="text-white">
                    {session?.created_at && new Date(session.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Última Atualização</p>
                  <p className="text-white">
                    {session?.updated_at && new Date(session.updated_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Ações */}
                {session?.status === 'completed' && session.video_url && (
                  <div className="pt-4 border-t border-[rgba(147,112,219,0.3)]">
                    <a
                      href={session.video_url}
                      download
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-center font-medium text-white transition hover:from-green-600 hover:to-emerald-700"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Vídeo
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MinhaGeracaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818] flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-violet-400 mx-auto" />
            <div className="absolute inset-0 h-12 w-12 animate-ping bg-violet-400/20 rounded-full" />
          </div>
          <p className="text-zinc-300">Carregando...</p>
        </div>
      </div>
    }>
      <MinhaGeracaoContent />
    </Suspense>
  );
}
