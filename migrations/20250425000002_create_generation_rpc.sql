-- Migration: Criar RPC para geração de vídeos
-- Data: 2025-04-25

-- RPC para verificar e debitar diamantes, criar generation
CREATE OR REPLACE FUNCTION create_video_generation(
  p_user_id UUID,
  p_image_url TEXT,
  p_diamond_cost INTEGER DEFAULT 50
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  generation_id UUID,
  new_balance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  generation_id_val UUID;
BEGIN
  -- Verificar se usuário tem diamantes suficientes
  SELECT balance_centavos INTO current_balance
  FROM profiles
  WHERE id = p_user_id;
  
  IF current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Usuário não encontrado', NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;
  
  IF current_balance < p_diamond_cost * 100 THEN
    RETURN QUERY SELECT FALSE, 'Diamantes insuficientes', NULL::UUID, current_balance / 100;
    RETURN;
  END IF;
  
  -- Debitar diamantes
  UPDATE profiles
  SET balance_centavos = balance_centavos - (p_diamond_cost * 100)
  WHERE id = p_user_id;
  
  -- Criar registro de generation
  INSERT INTO generations (user_id, image_url, diamond_cost, status)
  VALUES (p_user_id, p_image_url, p_diamond_cost, 'pending')
  RETURNING id INTO generation_id_val;
  
  -- Retornar sucesso
  RETURN QUERY SELECT 
    TRUE, 
    'Geração criada com sucesso', 
    generation_id_val,
    (current_balance - (p_diamond_cost * 100)) / 100;
END;
$$;

-- RPC para admin fazer upload do vídeo final
CREATE OR REPLACE FUNCTION complete_video_generation(
  p_generation_id UUID,
  p_video_url TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generation_user_id UUID;
BEGIN
  -- Verificar se generation existe e está pending
  SELECT user_id INTO generation_user_id
  FROM generations
  WHERE id = p_generation_id AND status = 'pending';
  
  IF generation_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Generation não encontrada ou já processada';
    RETURN;
  END IF;
  
  -- Atualizar generation com vídeo e status completed
  UPDATE generations
  SET video_url = p_video_url,
      status = 'completed'
  WHERE id = p_generation_id;
  
  RETURN QUERY SELECT TRUE, 'Vídeo entregue com sucesso';
END;
$$;
