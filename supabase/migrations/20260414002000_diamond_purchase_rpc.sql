-- Crédito atómico de diamantes + auditoria de compra.
--
-- Esta RPC evita a lógica "select then update" no backend e permite idempotência
-- via `payment_ref` (não credita 2x o mesmo pagamento).

alter table public.diamond_transactions
  add column if not exists payment_ref text;

create unique index if not exists diamond_transactions_purchase_payment_ref_uniq
  on public.diamond_transactions (payment_ref)
  where payment_ref is not null and payment_ref <> '';

create or replace function public.credit_diamonds_purchase(
  p_user_id uuid,
  p_diamonds integer,
  p_payment_ref text
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

  insert into public.diamond_transactions (user_id, delta, type, payment_ref)
  values (p_user_id, p_diamonds, 'purchase', p_payment_ref);

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
revoke all on function public.credit_diamonds_purchase(uuid, integer, text) from public;

