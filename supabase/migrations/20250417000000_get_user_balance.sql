-- RPC para calcular o saldo real do usuário somando diamond_transactions
CREATE OR REPLACE FUNCTION public.get_user_balance(
  user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  balance INTEGER;
BEGIN
  -- Somar todas as transações do usuário (créditos positivos, débitos negativos)
  SELECT COALESCE(SUM(amount), 0) INTO balance
  FROM public.diamond_transactions 
  WHERE user_id = user_id_param;
  
  RETURN balance;
END;
$$;

-- Conceder permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.get_user_balance TO authenticated;
