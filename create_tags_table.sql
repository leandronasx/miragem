-- Criar tabela de tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de relacionamento entre vídeos e tags
CREATE TABLE IF NOT EXISTS video_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, tag_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON video_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE
    ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir algumas tags iniciais (opcional)
INSERT INTO tags (name) VALUES 
  ('making-of'),
  ('behind the scenes'),
  ('tutorial'),
  ('demo'),
  ('preview'),
  ('trailer'),
  ('clip'),
  ('short'),
  ('long'),
  ('horizontal'),
  ('vertical'),
  ('portrait'),
  ('landscape'),
  ('4k'),
  ('hd'),
  ('cinema'),
  ('documentary'),
  ('interview'),
  ('presentation')
ON CONFLICT (name) DO NOTHING;
