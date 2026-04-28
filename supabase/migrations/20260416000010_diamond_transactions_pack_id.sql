-- Compat: usar `pack_id` como nome principal (pedido pelo produto).
alter table public.diamond_transactions
  add column if not exists pack_id text;

create index if not exists idx_diamond_transactions_pack_id
  on public.diamond_transactions (pack_id);

