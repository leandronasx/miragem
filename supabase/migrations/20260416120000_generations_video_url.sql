-- Link de entrega do vídeo por pedido (generation).
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS video_url text;

COMMENT ON COLUMN public.generations.video_url IS
  'URL pública do vídeo entregue ao cliente (preenchida ao finalizar o pedido no admin).';
