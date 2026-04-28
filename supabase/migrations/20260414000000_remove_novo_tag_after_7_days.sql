-- Remove automaticamente a tag 'novo' após 7 dias.
--
-- Requisitos:
-- - coluna `public.videos.tags` deve ser `jsonb` array (ex.: '["novo","x"]')
-- - coluna `public.videos.created_at` deve existir (timestamptz)
--
-- Agendamento:
-- - usa a extensão `pg_cron` para rodar 1x por dia (03:15 UTC)

create extension if not exists pg_cron with schema extensions;

create or replace function public.remove_novo_tag_after_7_days()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  update public.videos v
  set tags = coalesce(
    (
      select jsonb_agg(e.value)
      from jsonb_array_elements(coalesce(v.tags, '[]'::jsonb)) as e(value)
      where e.value <> to_jsonb('novo'::text)
    ),
    '[]'::jsonb
  )
  where v.created_at < (now() - interval '7 days')
    and coalesce(v.tags, '[]'::jsonb) @> '["novo"]'::jsonb;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- Garante que o job diário existe (idempotente)
do $$
begin
  begin
    perform cron.unschedule('remove_novo_tag_daily');
  exception
    when undefined_function then
      -- pg_cron antigo sem unschedule(name); ignora aqui (o schedule abaixo ainda funciona)
      null;
    when others then
      null;
  end;

  begin
    perform cron.schedule(
      'remove_novo_tag_daily',
      '15 3 * * *',
      $$select public.remove_novo_tag_after_7_days();$$
    );
  exception
    when duplicate_object then
      null;
    when others then
      -- Em alguns ambientes o pg_cron pode não estar disponível.
      -- Se falhar, use a alternativa via Edge Function agendada.
      null;
  end;
end $$;

