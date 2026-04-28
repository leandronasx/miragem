-- Adicionar campos de vídeo à tabela generations
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_delivered_at ON generations(delivered_at);
CREATE INDEX IF NOT EXISTS idx_generations_user_id_status ON generations(user_id, status);

-- Adicionar comentários
COMMENT ON COLUMN generations.video_url IS 'URL do vídeo gerado no Supabase Storage';
COMMENT ON COLUMN generations.thumbnail_url IS 'URL do thumbnail do vídeo (opcional)';
COMMENT ON COLUMN generations.delivered_at IS 'Data/hora da entrega para o cliente';
