-- Add `status` to support_sessions and enforce open/closed.
-- Safe to run multiple times.

ALTER TABLE public.support_sessions
  ADD COLUMN IF NOT EXISTS status text;

-- Default existing NULLs/new rows to 'open'
UPDATE public.support_sessions
  SET status = 'open'
  WHERE status IS NULL;

ALTER TABLE public.support_sessions
  ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE public.support_sessions
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_sessions_status_check'
  ) THEN
    ALTER TABLE public.support_sessions
      ADD CONSTRAINT support_sessions_status_check
      CHECK (status IN ('open', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_sessions_user_status_created
  ON public.support_sessions (user_id, status, created_at DESC);

-- Add `status` to support_sessions and enforce open/closed.
-- Safe to run multiple times.

ALTER TABLE public.support_sessions
  ADD COLUMN IF NOT EXISTS status text;

-- Default existing NULLs/new rows to 'open'
UPDATE public.support_sessions
  SET status = 'open'
  WHERE status IS NULL;

ALTER TABLE public.support_sessions
  ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE public.support_sessions
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_sessions_status_check'
  ) THEN
    ALTER TABLE public.support_sessions
      ADD CONSTRAINT support_sessions_status_check
      CHECK (status IN ('open', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_sessions_user_status_created
  ON public.support_sessions (user_id, status, created_at DESC);

