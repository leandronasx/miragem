"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { LoaderCircle, Download, Play, Gem } from "lucide-react"
import Link from "next/link"

interface Generation {
  id: string
  user_id: string
  image_url: string
  video_url?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  diamond_cost: number
  created_at: string
  completed_at?: string
}

export default function MinhasGeracoesPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userDiamonds, setUserDiamonds] = useState<number>(0)

  // Buscar usuário atual e diamantes
  useEffect(() => {
    const fetchUser = async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      setUser(user)

      if (user) {
        // Simulação de saldo de diamantes por enquanto
        setUserDiamonds(289)
      }
    }
    fetchUser()
  }, [])

  // Buscar gerações do usuário
  useEffect(() => {
    if (!user) return

    const fetchGenerations = async () => {
      try {
        const sb = createClient()
        // Simulação por enquanto - vamos mostrar dados mock
        const mockData: Generation[] = [
          {
            id: '1',
            user_id: user.id,
            image_url: 'https://via.placeholder.com/400x600/9333ea/ffffff?text=Processing...',
            status: 'pending',
            diamond_cost: 50,
            created_at: new Date().toISOString()
          }
        ]
        setGenerations(mockData)
      } catch (err) {
        console.error('Erro ao buscar gerações:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGenerations()
  }, [user])

  // Setup real-time updates (simplificado)
  useEffect(() => {
    if (!user) return

    // Simulação de atualização em tempo real por enquanto
    const interval = setInterval(() => {
      // Aqui vamos implementar polling depois
      console.log('Verificando atualizações...')
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818] flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <LoaderCircle className="h-12 w-12 animate-spin text-violet-400 mx-auto" />
            <div className="absolute inset-0 h-12 w-12 animate-ping bg-violet-400/20 rounded-full" />
          </div>
          <p className="text-zinc-400">Carregando suas gerações...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="h-12 w-12 text-violet-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Faça login para continuar</h2>
          <p className="text-zinc-400 mb-6">
            Acesse sua conta para ver suas gerações de vídeo
          </p>
          <Link 
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-fuchsia-700 transition"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0614] via-[#1a0a24] to-[#120818]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Minhas Gerações</h1>
          <p className="text-zinc-400">Acompanhe o status dos seus vídeos gerados por IA</p>
          
          {/* Saldo de Diamantes */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-lg">
            <Gem className="h-5 w-5 text-amber-400" />
            <span className="text-amber-300 font-medium">{userDiamonds} diamantes</span>
          </div>
        </div>

        {generations.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Play className="h-12 w-12 text-violet-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Nenhuma geração ainda</h2>
              <p className="text-zinc-400 mb-6">
                Comece gerando seus vídeos personalizados com IA por apenas 50 diamantes
              </p>
              <Link 
                href="/"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-fuchsia-700 transition"
              >
                Gerar Meu Primeiro Vídeo
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {generations.map((generation) => (
              <GenerationCard key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GenerationCard({ generation }: { generation: Generation }) {
  const [imageError, setImageError] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      case 'processing':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Aguardando processamento'
      case 'processing':
        return 'Processando seu vídeo...'
      case 'completed':
        return 'Vídeo pronto!'
      case 'failed':
        return 'Falha na geração'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Download className="h-4 w-4" />
      default:
        return <LoaderCircle className="h-4 w-4 animate-spin" />
    }
  }

  return (
    <div className="relative group">
      <div className="aspect-[9/16] w-full overflow-hidden rounded-xl border border-[rgba(147,112,219,0.3)] bg-black">
        {generation.status === 'completed' && generation.video_url ? (
          // Vídeo pronto - mostrar player
          <video
            src={generation.video_url}
            className="h-full w-full object-cover"
            controls
            playsInline
            poster={generation.image_url}
          />
        ) : (
          // Imagem com blur para pending/processing + loading animation
          <div className="relative h-full w-full">
            {!imageError ? (
              <Image
                src={generation.image_url}
                alt="Sua geração"
                fill
                className={`object-cover ${generation.status === 'pending' || generation.status === 'processing' ? 'blur-xl' : ''}`}
                onError={() => setImageError(true)}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-red-400 text-2xl">⚠️</span>
                  </div>
                  <p className="text-zinc-400 text-sm">Erro ao carregar imagem</p>
                </div>
              </div>
            )}
            
            {/* Overlay de loading bonito para pending/processing */}
            {(generation.status === 'pending' || generation.status === 'processing') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="shimmer absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                
                {/* Loading Animation */}
                <div className="relative mb-6">
                  <div className="relative">
                    <LoaderCircle className="h-14 w-14 animate-spin text-violet-400" />
                    <div className="absolute inset-0 h-14 w-14 animate-ping bg-violet-400/20 rounded-full" />
                    <div className="absolute inset-0 h-14 w-14 animate-pulse bg-violet-400/10 rounded-full" />
                  </div>
                  
                  {/* Wave Effect */}
                  <div className="absolute -inset-4">
                    <div className="h-full w-full rounded-full border-2 border-violet-400/30 animate-pulse" />
                  </div>
                </div>
                
                <div className="text-center z-10">
                  <p className="text-white text-xl font-semibold mb-3">
                    Processando seu vídeo...
                  </p>
                  <p className="text-zinc-300 text-sm max-w-xs px-4 mb-4">
                    A equipe está gerando seu vídeo personalizado com IA. Isso pode levar alguns minutos.
                  </p>
                  
                  {/* Custo em diamantes */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full">
                    <Gem className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-300 text-sm font-medium">
                      Custo: {generation.diamond_cost} diamantes
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(generation.status)}`}>
          {getStatusIcon(generation.status)}
          {getStatusText(generation.status)}
        </div>
      </div>

      {/* Download Button para completed */}
      {generation.status === 'completed' && generation.video_url && (
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={generation.video_url}
            download
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition"
          >
            <Download className="h-4 w-4" />
            Baixar Meu Vídeo
          </a>
        </div>
      )}

      {/* Info */}
      <div className="mt-3">
        <p className="text-zinc-400 text-xs">
          Criado em {new Date(generation.created_at).toLocaleDateString('pt-BR')}
        </p>
        {generation.completed_at && (
          <p className="text-zinc-400 text-xs">
            Concluído em {new Date(generation.completed_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  )
}
