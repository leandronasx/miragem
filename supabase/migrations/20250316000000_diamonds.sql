-- Se você já rodou a migration inicial antes, execute esta para adicionar diamantes.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diamonds INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.debit_diamonds(amount INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET diamonds = diamonds - amount
  WHERE id = auth.uid() AND diamonds >= amount
  RETURNING diamonds INTO new_balance;
  RETURN COALESCE(new_balance, -1);
END;
$$;
GRANT EXECUTE ON FUNCTION public.debit_diamonds(INTEGER) TO authenticated;
