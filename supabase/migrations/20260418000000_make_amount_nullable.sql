-- Remover restrição de NOT NULL da coluna amount na tabela diamond_transactions.
-- Isso é necessário porque transações de uso (geração de mídias), estornos e ajustes
-- manuais do admin não possuem valor monetário associado.

ALTER TABLE public.diamond_transactions 
  ALTER COLUMN amount DROP NOT NULL;
