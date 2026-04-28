import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const generationId = formData.get('generationId') as string
    const videoFile = formData.get('video') as File
    const thumbnailFile = formData.get('thumbnail') as File | null

    if (!generationId || !videoFile) {
      return NextResponse.json(
        { error: 'generationId e vídeo são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!allowedTypes.includes(videoFile.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use MP4, WebM, MOV ou AVI' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 100MB' },
        { status: 400 }
      )
    }

    // Buscar informações da geração
    const supabase = createServiceRoleClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Erro ao conectar com o banco de dados' },
        { status: 500 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: generation, error: fetchError } = await supabase
      .from('generations' as any)
      .select('user_id, status')
      .eq('id', generationId)
      .single()

    if (fetchError || !generation) {
      return NextResponse.json(
        { error: 'Geração não encontrada' },
        { status: 404 }
      )
    }

    // Type casting para evitar erros
    const genData = generation as unknown as { user_id: string; status: string }

    // Verificar se a geração pode ser entregue
    if (!['pending', 'ready', 'approved'].includes(genData.status)) {
      return NextResponse.json(
        { error: 'Esta geração não pode ser entregue no status atual' },
        { status: 400 }
      )
    }

    const userId = genData.user_id
    const storageBucket = 'generations'

    // Upload do vídeo principal
    const videoPath = `${userId}/${generationId}/video.${videoFile.name.split('.').pop()}`
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: videoUploadError } = await supabase.storage
      .from(storageBucket)
      .upload(videoPath, videoBuffer, {
        contentType: videoFile.type,
        upsert: true
      })

    if (videoUploadError) {
      console.error('Erro ao fazer upload do vídeo:', videoUploadError)
      return NextResponse.json(
        { error: 'Erro ao fazer upload do vídeo', details: videoUploadError.message },
        { status: 500 }
      )
    }

    // Obter URL pública do vídeo
    const { data: videoUrlData } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(videoPath)

    let thumbnailUrl = null

    // Upload do thumbnail se fornecido
    if (thumbnailFile) {
      const thumbnailPath = `${userId}/${generationId}/thumbnail.${thumbnailFile.name.split('.').pop()}`
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer())

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: thumbnailUploadError } = await supabase.storage
        .from(storageBucket)
        .upload(thumbnailPath, thumbnailBuffer, {
          contentType: thumbnailFile.type,
          upsert: true
        })

      if (!thumbnailUploadError) {
        const { data: thumbnailUrlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(thumbnailPath)
        thumbnailUrl = thumbnailUrlData.publicUrl
      } else {
        console.error('Erro ao fazer upload do thumbnail:', thumbnailUploadError)
        // Não falhar se o thumbnail falhar
      }
    }

    // Atualizar o registro da geração
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await supabase
      .from('generations' as any)
      .update({
        video_url: videoUrlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .eq('id', generationId)

    if (updateError) {
      console.error('Erro ao atualizar geração:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar geração', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      videoUrl: videoUrlData.publicUrl,
      thumbnailUrl: thumbnailUrl,
      message: 'Vídeo enviado com sucesso!'
    })

  } catch (error) {
    console.error('Erro no upload de vídeo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
