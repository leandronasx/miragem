-- Liga sessão de suporte fechada ao pedido (generation) e à URL de entrega.
ALTER TABLE public.support_sessions
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS generation_id uuid REFERENCES public.generations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_sessions_status_closed_at
  ON public.support_sessions (status, closed_at DESC NULLS LAST)
  WHERE status = 'closed';

COMMENT ON COLUMN public.support_sessions.video_url IS
  'URL de entrega do vídeo (espelhada ao finalizar o pedido / generation).';
COMMENT ON COLUMN public.support_sessions.generation_id IS
  'Pedido (generation) associado quando o admin finaliza o atendimento.';
