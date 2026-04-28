-- Catálogo oficial: apenas `public.videos` (não usar tabela `models`).

CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  prompt text,
  video_url text NOT NULL,
  thumbnail_url text
);

CREATE INDEX IF NOT EXISTS idx_videos_id_desc ON public.videos (id DESC);

-- `support_sessions.model_id` → vídeo escolhido no fluxo "Gerar"
ALTER TABLE public.support_sessions
  DROP CONSTRAINT IF EXISTS support_sessions_model_id_fkey;

ALTER TABLE public.support_sessions
  ADD COLUMN IF NOT EXISTS model_id uuid;

ALTER TABLE public.support_sessions
  ADD CONSTRAINT support_sessions_model_id_fkey
  FOREIGN KEY (model_id) REFERENCES public.videos (id) ON DELETE SET NULL;

ALTER TABLE public.support_sessions DROP CONSTRAINT IF EXISTS support_sessions_generation_id_fkey;
ALTER TABLE public.support_sessions DROP COLUMN IF EXISTS generation_id;

ALTER TABLE public.support_sessions DROP CONSTRAINT IF EXISTS support_sessions_status_check;
UPDATE public.support_sessions
SET status = 'open'
WHERE status IS NULL OR status NOT IN ('open', 'processing', 'closed');

ALTER TABLE public.support_sessions
  ADD CONSTRAINT support_sessions_status_check
  CHECK (status IN ('open', 'processing', 'closed'));

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.support_sessions
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON TABLE public.videos IS 'Catálogo (home): thumbnail_url + video_url.';
COMMENT ON COLUMN public.support_sessions.model_id IS 'Id em public.videos ao clicar em Gerar.';
COMMENT ON COLUMN public.support_messages.image_url IS 'URL direta de imagem (anexo leve).';
