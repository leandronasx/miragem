-- RPC para verificar e debitar diamantes em uma única chamada
CREATE OR REPLACE FUNCTION public.check_and_debit_diamonds(
  user_id_param UUID,
  cost_param INTEGER DEFAULT 1
)
RETURNS TABLE(
  success BOOLEAN,
  diamonds_before INTEGER,
  diamonds_after INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_diamonds INTEGER;
BEGIN
  -- Obter saldo atual do usuário
  SELECT diamonds INTO current_diamonds 
  FROM public.profiles 
  WHERE id = user_id_param;
  
  -- Se não encontrar o perfil
  IF current_diamonds IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Perfil não encontrado';
    RETURN;
  END IF;
  
  -- Verificar se tem saldo suficiente
  IF current_diamonds < cost_param THEN
    RETURN QUERY SELECT FALSE, current_diamonds, current_diamonds, 'Saldo insuficiente';
    RETURN;
  END IF;
  
  -- Debitar diamantes
  UPDATE public.profiles 
  SET diamonds = diamonds - cost_param 
  WHERE id = user_id_param;
  
  -- Retornar sucesso
  RETURN QUERY SELECT TRUE, current_diamonds, current_diamonds - cost_param, 'Diamantes debitados com sucesso';
  
END;
$$;

-- Conceder permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.check_and_debit_diamonds TO authenticated;
