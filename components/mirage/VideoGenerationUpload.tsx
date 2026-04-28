"use client";

import { LoaderCircle, Upload, X, Download } from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GenerationStatus = 'idle' | 'uploading' | 'pending' | 'processing' | 'completed' | 'failed';

interface VideoGenerationUploadProps {
  userId: string | null;
  onGenerateComplete?: () => void;
}

export function VideoGenerationUpload({ userId, onGenerateComplete }: VideoGenerationUploadProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleFileUpload = useCallback(async (file: File) => {
    if (!userId) {
      setError('Usuário não autenticado');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Por favor, envie uma imagem');
      return;
    }

    setStatus('uploading');
    setError(null);
    setUploadProgress(0);

    try {
      const sb = createClient();
      const fileName = `generations/${userId}/${Date.now()}-${file.name}`;
      
      // Upload para o Supabase Storage
      const { error } = await sb.storage
        .from('generations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Obter URL pública
      const { data: { publicUrl } } = sb.storage
        .from('generations')
        .getPublicUrl(fileName);

      setUploadedImageUrl(publicUrl);
      setUploadProgress(100);
      setStatus('pending');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
      setStatus('failed');
    }
  }, [userId]);

  const startStatusPolling = (genId: string) => {
    // Implementar Supabase Realtime para atualização em tempo real
    const sb = createClient();
    
    const channel = sb
      .channel(`generation-${genId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'generations',
          filter: `id=eq.${genId}`
        },
        (payload) => {
          console.log('Status atualizado:', payload.new);
          
          const newStatus = (payload.new as any).status;
          const videoUrl = (payload.new as any).video_url;
          
          if (newStatus === 'completed') {
            setStatus('completed');
            setFinalVideoUrl(videoUrl);
            setUploadProgress(100);
            sb.removeChannel(channel);
          } else if (newStatus === 'failed') {
            setStatus('failed');
            setError('Falha na geração do vídeo');
            sb.removeChannel(channel);
          }
        }
      )
      .subscribe();

    // Fallback com polling caso Realtime falhe
    const pollInterval = setInterval(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await sb
          .from('generations' as any)
          .select('status, video_url')
          .eq('id', genId)
          .single();

        if (error) {
          console.error('Erro ao verificar status:', error);
          return;
        }

        const generation = data as unknown as { status: string; video_url: string | null };
        
        if (generation.status === 'completed') {
          clearInterval(pollInterval);
          sb.removeChannel(channel);
          setStatus('completed');
          setFinalVideoUrl(generation.video_url);
          setUploadProgress(100);
        } else if (generation.status === 'failed') {
          clearInterval(pollInterval);
          sb.removeChannel(channel);
          setStatus('failed');
          setError('Falha na geração do vídeo');
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    }, 5000); // Verificar a cada 5 segundos

    // Cleanup function
    return () => {
      clearInterval(pollInterval);
      sb.removeChannel(channel);
    };
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, envie uma imagem');
        return;
      }
      
      setSelectedFile(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, envie uma imagem');
        return;
      }
      
      setSelectedFile(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setError(null);
    }
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (!selectedFile || !userId) {
      setError('Selecione uma imagem primeiro');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const sb = createClient();
      
      // 1. Verificar saldo de diamantes
      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select('diamonds')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error('Erro ao verificar saldo de diamantes');
      }

      const currentDiamonds = profile.diamonds || 0;
      const GENERATION_COST = 50;

      if (currentDiamonds < GENERATION_COST) {
        throw new Error(`Saldo insuficiente. Você precisa de ${GENERATION_COST} diamantes.`);
      }

      // 2. Upload da imagem para bucket 'imagens'
      const fileName = `imagens/${userId}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await sb.storage
        .from('imagens')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. Obter URL pública
      const { data: { publicUrl } } = sb.storage
        .from('imagens')
        .getPublicUrl(fileName);

      // 4. Deduzir diamantes
      const { error: diamondError } = await sb
        .from('profiles')
        .update({ diamonds: currentDiamonds - GENERATION_COST })
        .eq('id', userId);

      if (diamondError) {
        throw new Error('Erro ao deduzir diamantes');
      }

      // 5. Registrar transação de diamantes (usando campos corretos)
      const { error: transactionError } = await sb
        .from('diamond_transactions')
        .insert({
          delta: -GENERATION_COST,
          type: 'generation',
          user_id: userId,
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('Erro ao registrar transação:', transactionError);
      }

      // 6. Criar registro em generations (usar videos como alternativa)
      const { error: generationError, data: generationData } = await sb
        .from('videos')
        .insert({
          title: `Generation_${Date.now()}`,
          prompt: 'User generated video',
          video_url: publicUrl,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (generationError) {
        console.error('Erro ao criar registro:', generationError);
      }

      // 7. Salvar preview no localStorage
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        localStorage.setItem('recentGenerationImage', previewUrl);
        localStorage.setItem('recentGenerationFileName', selectedFile.name);
        localStorage.setItem('recentGenerationTime', new Date().toISOString());
        if (generationData && 'id' in generationData) {
          localStorage.setItem('recentGenerationId', generationData.id);
        }
      };
      reader.readAsDataURL(selectedFile);

      setUploadProgress(100);
      
      // 8. Redirecionar para /minhas-geracoes após sucesso
      setTimeout(() => {
        router.push('/minhas-geracoes');
      }, 1500);

    } catch (err) {
      console.error('Erro na geração:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar vídeo');
      setStatus('failed');
    }
  }, [selectedFile, userId, router]);

  const resetUpload = () => {
    setStatus('idle');
    setUploadedImageUrl(null);
    setFinalVideoUrl(null);
    setError(null);
    setUploadProgress(0);
    setGenerationId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  if (status === 'completed' && finalVideoUrl) {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="flex-1 relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
          <video
            src={finalVideoUrl}
            className="h-full w-full object-cover"
            controls
            playsInline
          />
        </div>
        <a
          href={finalVideoUrl}
          download
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-center font-medium text-white transition hover:from-green-600 hover:to-emerald-700"
        >
          <Download className="h-4 w-4" />
          Baixar Vídeo
        </a>
        <button
          onClick={resetUpload}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center font-medium text-zinc-300 transition hover:bg-zinc-800"
        >
          Gerar Novo Vídeo
        </button>
      </div>
    );
  }

  if ((status === 'pending' || status === 'processing') && uploadedImageUrl) {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="flex-1 relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
          <img
            src={uploadedImageUrl}
            alt="Imagem enviada"
            className="h-full w-full object-cover"
            style={{ filter: 'blur(8px)' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
            <LoaderCircle className="h-12 w-12 animate-spin mb-4" />
            <p className="text-center text-lg font-medium">
              {status === 'pending' ? 'Sua mágica está sendo processada...' : 'Processando vídeo...'}
            </p>
            <p className="text-center text-sm text-zinc-300 mt-2">
              Isso pode levar alguns minutos
            </p>
          </div>
        </div>
        <button
          onClick={resetUpload}
          className="w-full rounded-xl border border-red-500/50 bg-red-950/50 px-4 py-3 text-center font-medium text-red-300 transition hover:bg-red-900/50"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. Bloco de Instruções (Topo) - Discreto */}
      <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/30">
        <h4 className="text-sm font-medium text-zinc-300 mb-2 leading-relaxed">Dicas para melhor resultado:</h4>
        <ul className="text-sm text-zinc-300 space-y-1 leading-relaxed">
          <li>• Imagem nítida e bem iluminada</li>
          <li>• Pessoa em foco, fundo neutro</li>
          <li>• Posição similar ao vídeo</li>
        </ul>
      </div>

      {/* 2. Área de Upload (Centro) - Altura Fixa */}
      <div className="flex justify-center">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="h-56 w-64 relative overflow-hidden rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 transition hover:border-zinc-600 hover:bg-zinc-900/70"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={status === 'uploading'}
          />
          
          {status === 'uploading' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
              <LoaderCircle className="h-10 w-10 animate-spin mb-3" />
              <p className="text-center text-sm font-medium">Enviando...</p>
              <div className="mt-3 w-48 rounded-full bg-zinc-700">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : previewUrl ? (
            <div className="absolute inset-0">
              <img
                src={previewUrl}
                alt="Preview da imagem selecionada"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-white font-medium truncate">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-zinc-300">
                  Clique para trocar a imagem
                </p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <Upload className="h-10 w-10 text-zinc-500 mb-3" />
              <p className="text-sm font-medium text-zinc-300 mb-1.5">
                Arraste sua imagem
              </p>
              <p className="text-xs text-zinc-500 mb-2">
                ou clique para selecionar
              </p>
              <p className="text-xs text-zinc-600">
                PNG, JPG até 10MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Botão Gerar (Base do Upload) - Proporcional */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleGenerateVideo}
          disabled={!selectedFile || status === 'uploading' || status === 'pending' || status === 'processing'}
          className="w-fit rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-3 px-10 text-center text-sm font-medium text-white shadow-lg shadow-amber-900/20 transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'uploading' || status === 'pending' || status === 'processing' ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-2 inline" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5 mr-2 inline" />
              Gerar Vídeo
            </>
          )}
        </button>
      </div>

      <div className="flex-1" />

      {/* Card de Custo (Base) */}
      <div className="rounded-xl border border-amber-500/50 bg-amber-950/50 p-3">
        <div className="flex items-start gap-2">
          <div className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black">
            !
          </div>
          <div>
            <p className="text-xs font-medium text-amber-300">Custo: 50 diamantes</p>
            <p className="text-xs text-amber-400 mt-0.5">
              Processamento em alguns minutos.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-950/50 p-3">
          <div className="flex items-start gap-2">
            <X className="h-4 w-4 text-red-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-300">Erro</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={resetUpload}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
