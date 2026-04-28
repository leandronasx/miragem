"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { LoaderCircle, Send, Eye, CheckCircle, Clock, AlertCircle, Search, Upload, Video, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Generation {
  id: string
  user_id: string
  prompt: string
  image_url: string
  video_url?: string
  thumbnail_url?: string
  blur_data_url?: string
  status: 'pending' | 'ready' | 'approved' | 'delivered' | 'processing' | 'failed'
  created_at: string
  updated_at: string
  delivered_at?: string
  profiles?: {
    email: string
    display_name?: string
  }
}

interface DeliveryTabProps {
  initialGenerations: any[]
}

export function DeliveryTab({ initialGenerations }: DeliveryTabProps) {
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations)
  const [deliveringId, setDeliveringId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: { video: File; thumbnail?: File } }>({})
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  const filteredGenerations = generations.filter(g => 
    ['pending', 'ready', 'approved'].includes(g.status) &&
    (g.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
     g.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     g.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleVideoSelect = (generationId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFiles(prev => ({
        ...prev,
        [generationId]: { ...prev[generationId], video: file }
      }))
    }
  }

  const handleThumbnailSelect = (generationId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFiles(prev => ({
        ...prev,
        [generationId]: { ...prev[generationId], thumbnail: file }
      }))
    }
  }

  const handleVideoUpload = async (generation: Generation) => {
    const files = selectedFiles[generation.id]
    if (!files?.video) {
      setToast({
        type: 'error',
        message: 'Selecione um vídeo para fazer upload'
      })
      return
    }

    setUploadingId(generation.id)
    setToast(null)

    try {
      const formData = new FormData()
      formData.append('generationId', generation.id)
      formData.append('video', files.video)
      if (files.thumbnail) {
        formData.append('thumbnail', files.thumbnail)
      }

      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[generation.id] || 0
          if (current < 90) {
            return { ...prev, [generation.id]: current + 10 }
          }
          return prev
        })
      }, 200)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await fetch('/api/upload-generation-video', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, [generation.id]: 100 }))

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fazer upload')
      }

      const result = await response.json()

      // Atualizar estado local
      setGenerations(prev => prev.map(g => 
        g.id === generation.id 
          ? { 
              ...g, 
              status: 'delivered', 
              video_url: result.videoUrl,
              thumbnail_url: result.thumbnailUrl,
              delivered_at: new Date().toISOString()
            }
          : g
      ))

      // Limpar seleção de arquivos
      setSelectedFiles(prev => {
        const newFiles = { ...prev }
        delete newFiles[generation.id]
        return newFiles
      })

      setToast({
        type: 'success',
        message: 'Vídeo enviado com sucesso!'
      })

    } catch (error) {
      console.error('Error uploading video:', error)
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao fazer upload do vídeo'
      })
    } finally {
      setUploadingId(null)
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[generation.id]
        return newProgress
      })
    }
  }

  const handleSendToClient = async (generation: Generation) => {
    setDeliveringId(generation.id)
    setToast(null)

    try {
      const sb = createClient()

      // 1. Atualizar status para delivered
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await sb
        .from('generations' as any)
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', generation.id)

      if (updateError) {
        throw updateError
      }

      // 2. Enviar email
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailResponse = await fetch('/api/send-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: generation.profiles?.email,
          displayName: generation.profiles?.display_name,
          prompt: generation.prompt,
          imageUrl: generation.image_url,
          videoUrl: generation.video_url,
          generationId: generation.id
        }),
      })

      if (!emailResponse.ok) {
        console.error('Email sending failed:', await emailResponse.text())
        // Não falhar completamente se o email falhar
      }

      // 3. Atualizar estado local
      setGenerations(prev => prev.map(g => 
        g.id === generation.id 
          ? { ...g, status: 'delivered', delivered_at: new Date().toISOString() }
          : g
      ))

      setToast({
        type: 'success',
        message: `Geração enviada com sucesso para ${generation.profiles?.email}`
      })

    } catch (error) {
      console.error('Error delivering generation:', error)
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao enviar geração'
      })
    } finally {
      setDeliveringId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "warning",
      ready: "default", 
      approved: "success",
      delivered: "secondary",
      processing: "default",
      failed: "destructive"
    }

    const icons = {
      pending: <Clock className="h-3 w-3" />,
      ready: <Eye className="h-3 w-3" />,
      approved: <CheckCircle className="h-3 w-3" />,
      delivered: <Send className="h-3 w-3" />,
      processing: <LoaderCircle className="h-3 w-3 animate-spin" />,
      failed: <AlertCircle className="h-3 w-3" />
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] as any} className="gap-1">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Entrega de Gerações</h2>
          <p className="text-zinc-400 mt-1">
            {filteredGenerations.length} geração{filteredGenerations.length !== 1 ? 'ões' : ''} pronta{filteredGenerations.length !== 1 ? 's' : ''} para entrega
          </p>
        </div>
      </div>

      {toast && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          toast.type === 'success' 
            ? 'border-emerald-500/25 bg-emerald-950/30 text-emerald-100'
            : 'border-red-500/25 bg-red-950/30 text-red-100'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Buscar por prompt, email ou nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredGenerations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-zinc-400">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhuma geração encontrada' : 'Nenhuma geração pendente'}
              </p>
              <p className="text-sm">
                {searchTerm ? 'Tente ajustar sua busca' : 'Todas as gerações estão entregues ou processando'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGenerations.map((generation) => (
            <Card key={generation.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Preview da imagem */}
                  <div className="flex-shrink-0">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                      <Image
                        src={generation.image_url}
                        alt="Generated image"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(generation.status)}
                      <span className="text-sm text-zinc-400">
                        ID: {generation.id.slice(0, 8)}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {new Date(generation.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    <div>
                      <p className="text-sm text-zinc-300 mb-1">
                        Cliente: {generation.profiles?.display_name || generation.profiles?.email}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {generation.profiles?.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white mb-1">Prompt:</p>
                      <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded p-2">
                        {truncateText(generation.prompt, 100)}
                      </p>
                    </div>

                    {/* Upload de vídeo */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Video className="h-4 w-4" />
                        Upload de Vídeo
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Upload do vídeo principal */}
                        <div className="relative">
                          <input
                            type="file"
                            accept=".mp4,.webm,.mov,.avi"
                            onChange={(e) => handleVideoSelect(generation.id, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingId === generation.id}
                          />
                          <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-zinc-400" />
                              <span className="text-sm text-zinc-300">
                                {selectedFiles[generation.id]?.video?.name || 'Selecionar vídeo (.mp4, .webm, .mov)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Upload do thumbnail (opcional) */}
                        <div className="relative">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={(e) => handleThumbnailSelect(generation.id, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingId === generation.id}
                          />
                          <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-zinc-400" />
                              <span className="text-sm text-zinc-300">
                                {selectedFiles[generation.id]?.thumbnail?.name || 'Thumbnail (opcional)'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar de upload */}
                      {uploadingId === generation.id && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>Fazendo upload...</span>
                            <span>{uploadProgress[generation.id] || 0}%</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-violet-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[generation.id] || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex-shrink-0 space-y-2">
                    <Button
                      onClick={() => handleVideoUpload(generation)}
                      disabled={uploadingId === generation.id || !selectedFiles[generation.id]?.video}
                      className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700"
                    >
                      {uploadingId === generation.id ? (
                        <>
                          <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                          {uploadProgress[generation.id] || 0}%
                        </>
                      ) : (
                        <>
                          <Video className="h-4 w-4 mr-2" />
                          Enviar Vídeo
                        </>
                      )}
                    </Button>
                    
                    {generation.video_url && (
                      <Button
                        onClick={() => handleSendToClient(generation)}
                        disabled={deliveringId === generation.id}
                        variant="outline"
                        className="w-full"
                      >
                        {deliveringId === generation.id ? (
                          <>
                            <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar por Email
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
