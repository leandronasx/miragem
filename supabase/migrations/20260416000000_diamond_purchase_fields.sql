-- Refinar auditoria de compras de Diamond Packs (Mercado Pago)
-- - Guardar valor pago (amount), pack (product_id) e status do pagamento.
-- - Manter `created_at default now()` (timestamp automático no DB).

alter table public.diamond_transactions
  add column if not exists amount numeric,
  add column if not exists product_id text,
  add column if not exists pack_id text,
  add column if not exists status text;

-- RPC v2: crédito atómico + auditoria com campos extra.
create or replace function public.credit_diamonds_purchase_v2(
  p_user_id uuid,
  p_diamonds integer,
  p_payment_ref text,
  p_amount numeric,
  p_product_id text,
  p_status text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_user_id is null then
    raise exception 'user_id obrigatório';
  end if;
  if p_diamonds is null or p_diamonds <= 0 then
    raise exception 'diamonds inválido';
  end if;
  if p_payment_ref is null or btrim(p_payment_ref) = '' then
    raise exception 'payment_ref obrigatório';
  end if;

  -- Idempotência: se já existe transação para este pagamento, retorna saldo atual.
  if exists (
    select 1 from public.diamond_transactions
    where payment_ref = p_payment_ref
  ) then
    select coalesce(diamonds, 0) into new_balance
    from public.profiles
    where id = p_user_id;
    return coalesce(new_balance, 0);
  end if;

  update public.profiles
  set diamonds = coalesce(diamonds, 0) + p_diamonds
  where id = p_user_id
  returning diamonds into new_balance;

  if new_balance is null then
    raise exception 'profile não encontrado';
  end if;

  insert into public.diamond_transactions (
    user_id,
    delta,
    type,
    payment_ref,
    amount,
    product_id,
    pack_id,
    status
  )
  values (
    p_user_id,
    p_diamonds,
    'purchase',
    p_payment_ref,
    p_amount,
    nullif(btrim(p_product_id), ''),
    nullif(btrim(p_product_id), ''),
    nullif(btrim(p_status), '')
  );

  return new_balance;
exception
  when unique_violation then
    -- Duas execuções concorrentes: uma insere primeiro; a outra cai aqui.
    select coalesce(diamonds, 0) into new_balance
    from public.profiles
    where id = p_user_id;
    return coalesce(new_balance, 0);
end;
$$;

-- Não expor RPC a anon/authenticated por padrão (webhook usa service role).
revoke all on function public.credit_diamonds_purchase_v2(uuid, integer, text, numeric, text, text) from public;

