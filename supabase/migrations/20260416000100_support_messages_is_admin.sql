-- Diferenciar mensagens do suporte (admin) vs utilizador.
alter table public.support_messages
  add column if not exists is_admin boolean not null default false;

create index if not exists idx_support_messages_created_at
  on public.support_messages (created_at desc);

