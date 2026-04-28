"use client";

import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, Upload, Eye, X, Download, Bell } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type Generation = {
  id: string;
  user_id: string;
  image_url: string;
  video_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  diamond_cost: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  profiles?: {
    email: string;
    display_name: string | null;
  };
};

export function ProductionQueueTab() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // Buscar gerações pendentes do Supabase
  useEffect(() => {
    const fetchGenerations = async () => {
      try {
        const sb = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await sb
          .from('generations' as any)
          .select(`
            *,
            profiles!inner(email, display_name)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar gerações:', error);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setGenerations((data as unknown as Generation[]) || []);
      } catch (err) {
        console.error('Erro ao buscar gerações:', err);
      }
    };

    fetchGenerations();
  }, []);

  // Implementar Supabase Realtime para atualização automática
  useEffect(() => {
    const sb = createClient();
    
    const channel = sb
      .channel('realtime:generations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'generations' },
        (payload) => {
          console.log('Mudança no generations:', payload);
          
          // Se for um novo pedido pending
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            setNewOrderCount(prev => prev + 1);
            
            // Tocar som de notificação visual
            setIsPlayingSound(true);
            setTimeout(() => setIsPlayingSound(false), 1000);
            
            // Atualizar lista
            setGenerations(prev => [payload.new as Generation, ...prev]);
          }
          
          // Se um pedido for completado, remover da lista
          if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
            setGenerations(prev => prev.filter(g => g.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // Fazer upload do vídeo final
  const handleVideoUpload = async () => {
    if (!selectedGeneration || !videoFile) return;

    setUploadingId(selectedGeneration.id);
    setToast(null);

    try {
      const sb = createClient();
      
      // Upload do vídeo para o storage
      const fileName = `generations/${selectedGeneration.id}/${Date.now()}-${videoFile.name}`;
      const { error: uploadError } = await sb.storage
        .from('generations')
        .upload(fileName, videoFile);

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = sb.storage
        .from('generations')
        .getPublicUrl(fileName);

      // Atualizar generation para completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await sb
        .from('generations' as any)
        .update({
          status: 'completed',
          video_url: publicUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedGeneration.id);

      if (updateError) {
        throw updateError;
      }

      setToast({ type: 'ok', text: 'Vídeo entregue com sucesso!' });
      
      // Fechar modal e atualizar lista
      setSelectedGeneration(null);
      setVideoFile(null);
      
      // Remover da lista de pendentes
      setGenerations(prev => prev.filter(g => g.id !== selectedGeneration.id));

    } catch (err) {
      setToast({ 
        type: 'err', 
        text: err instanceof Error ? err.message : 'Erro ao fazer upload' 
      });
    } finally {
      setUploadingId(null);
    }
  };

  // Resetar contador de novos pedidos quando usuário vê
  useEffect(() => {
    if (newOrderCount > 0) {
      const timer = setTimeout(() => setNewOrderCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [newOrderCount]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[#e9d5ff]">
            Fila de Produção
          </h2>
          {newOrderCount > 0 && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 ${isPlayingSound ? 'animate-pulse' : ''}`}>
              <Bell className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">
                {newOrderCount} novo{newOrderCount > 1 ? 's' : ''} pedido{newOrderCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <div className="text-sm text-[rgba(232,224,240,0.8)]">
          {generations.length} pedido{generations.length !== 1 ? 's' : ''} pendente{generations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {toast ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            toast.type === "ok"
              ? "border-emerald-500/25 bg-emerald-950/30 text-emerald-100"
              : "border-red-500/25 bg-red-950/30 text-red-100"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      ) : null}

      {generations.length === 0 ? (
        <p className="rounded-2xl border border-[rgba(147,112,219,0.25)] bg-black/30 px-4 py-3 text-sm text-[var(--muted)]">
          Nenhum pedido na fila de produção.
        </p>
      ) : (
        <div className="grid gap-4">
          {generations.map((generation) => (
            <div
              key={generation.id}
              className="overflow-hidden rounded-2xl border border-[rgba(147,112,219,0.22)] bg-black/25"
            >
              <div className="grid grid-cols-12 gap-4 p-4">
                {/* Miniatura da imagem */}
                <div className="col-span-2">
                  <div className="relative aspect-[9/16] w-16 overflow-hidden rounded-lg bg-black">
                    <Image
                      src={generation.image_url}
                      alt="Imagem enviada"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Informações do pedido */}
                <div className="col-span-6">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-[#e9d5ff]">
                      {generation.profiles?.display_name || generation.profiles?.email}
                    </div>
                    <div className="text-xs text-[rgba(232,224,240,0.6)]">
                      {generation.profiles?.email}
                    </div>
                    <div className="text-xs text-[rgba(232,224,240,0.6)]">
                      {new Date(generation.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>
                    <div className="text-xs text-amber-300">
                      Custo: {generation.diamond_cost} diamantes
                    </div>
                  </div>
                </div>

                {/* Status e ações */}
                <div className="col-span-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedGeneration(generation)}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-900/20 transition hover:brightness-110"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      {selectedGeneration && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-[rgba(15,10,24,0.75)] backdrop-blur-md"
            onClick={() => {
              setSelectedGeneration(null);
              setVideoFile(null);
            }}
          />
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgba(147,112,219,0.4)] bg-[rgba(26,15,46,0.95)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6">
            <button
              type="button"
              className="absolute right-4 top-4 h-8 w-8 rounded-full border border-[rgba(147,112,219,0.35)] bg-[rgba(15,10,24,0.65)] text-lg leading-none text-[#e9d5ff] hover:bg-[rgba(147,112,219,0.35)]"
              onClick={() => {
                setSelectedGeneration(null);
                setVideoFile(null);
              }}
            >
              ×
            </button>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#e9d5ff] mb-2">
                  Pedido #{selectedGeneration.id.slice(0, 8)}
                </h3>
                <div className="text-sm text-[rgba(232,224,240,0.8)] space-y-1">
                  <div>Cliente: {selectedGeneration.profiles?.display_name || selectedGeneration.profiles?.email}</div>
                  <div>Data: {new Date(selectedGeneration.created_at).toLocaleString("pt-BR")}</div>
                  <div>Custo: {selectedGeneration.diamond_cost} diamantes</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Imagem original */}
                <div>
                  <h4 className="text-sm font-medium text-[#e9d5ff] mb-2">Imagem Enviada</h4>
                  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
                    <Image
                      src={selectedGeneration.image_url}
                      alt="Imagem enviada"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Upload do vídeo */}
                <div>
                  <h4 className="text-sm font-medium text-[#e9d5ff] mb-2">Upload do Vídeo Final</h4>
                  <div className="space-y-4">
                    <div
                      className={`relative aspect-[9/16] w-full overflow-hidden rounded-xl border-2 border-dashed ${
                        videoFile ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-zinc-700 bg-zinc-900/50'
                      } transition`}
                    >
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        disabled={uploadingId === selectedGeneration.id}
                      />
                      
                      {videoFile ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
                          <video
                            src={URL.createObjectURL(videoFile)}
                            className="h-full w-full object-cover rounded-lg"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                            {videoFile.name}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <Upload className="h-12 w-12 text-zinc-500 mb-4" />
                          <p className="text-sm text-zinc-300 mb-2">
                            Arraste o vídeo aqui
                          </p>
                          <p className="text-xs text-zinc-500">
                            ou clique para selecionar
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleVideoUpload}
                      disabled={!videoFile || uploadingId === selectedGeneration.id}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-center font-medium text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingId === selectedGeneration.id ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin mr-2 inline" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2 inline" />
                          Fazer Upload do Vídeo Final
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
