-- RPC compatível com webhook Mercado Pago: adiciona diamantes de forma atómica e
-- regista transação em `diamond_transactions` com type='purchase'.

create or replace function public.add_diamonds_to_user(
  p_user_id uuid,
  p_diamonds integer,
  p_payment_ref text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.credit_diamonds_purchase(p_user_id, p_diamonds, p_payment_ref);
end;
$$;

revoke all on function public.add_diamonds_to_user(uuid, integer, text) from public;

