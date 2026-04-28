-- Registo de transações de diamantes (auditoria).

create table if not exists public.diamond_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  type text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists idx_diamond_transactions_user_created
  on public.diamond_transactions (user_id, created_at desc);

alter table public.diamond_transactions enable row level security;

-- Por padrão: ninguém lê via anon. Admin usa service role no servidor.
create policy "diamond_transactions_no_anon_select"
  on public.diamond_transactions for select
  to anon
  using (false);

