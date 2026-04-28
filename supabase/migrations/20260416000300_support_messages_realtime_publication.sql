-- Garante que INSERT/UPDATE em support_messages e support_sessions cheguem ao Realtime.
-- (No Dashboard: Database → Replication → também marque as tabelas se necessário.)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_sessions;
  END IF;
END $$;
