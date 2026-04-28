-- =============================================================================
-- Apagar TODOS os registros de public.videos (vídeos de teste / uploads manuais)
-- =============================================================================
-- Onde executar: Supabase Dashboard → SQL Editor → colar → Run.
--
-- Efeitos colaterais (se as FKs do teu projeto tiverem ON DELETE CASCADE):
--   - Linhas em tabelas que referenciam videos.id (ex.: purchases com video_id,
--     video_likes) podem ser removidas automaticamente.
--   - Confirma no teu schema: Table editor → videos → Foreign keys.
--
-- NÃO remove ficheiros no Storage (R2 / Supabase Storage). Limpar buckets é
-- manual no dashboard do storage ou via API.
--
-- Pré-visualização (opcional, descomenta):
-- SELECT id, title, created_at FROM public.videos ORDER BY created_at DESC;
-- =============================================================================

BEGIN;

DELETE FROM public.videos;

COMMIT;

-- Após correr: a página /explore deve mostrar galeria vazia (sem vídeos na BD).
