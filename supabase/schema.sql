-- Mirage Fantasy — esquema base (execute no SQL Editor do Supabase)

-- Perfis (1:1 com auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  balance_centavos bigint not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  video_url text not null,
  poster_url text not null,
  price_centavos int not null default 999,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_centavos bigint not null,
  type text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.video_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.purchases enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.video_likes enable row level security;

-- Perfis: cada um vê/edita o próprio
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_admin_select_all" on public.profiles
  for select using (
    auth.uid() in (select id from public.profiles where is_admin = true)
  );

-- Vídeos publicados: leitura pública; admin: tudo
create policy "videos_select_published" on public.videos
  for select using (is_published = true or auth.uid() in (
    select id from public.profiles where is_admin = true
  ));
create policy "videos_admin_all" on public.videos
  for all using (
    auth.uid() in (select id from public.profiles where is_admin = true)
  );

-- Compras: só o dono
create policy "purchases_select_own" on public.purchases
  for select using (auth.uid() = user_id);
create policy "purchases_insert_own" on public.purchases
  for insert with check (auth.uid() = user_id);

-- Carteira: só o dono lê
create policy "wallet_select_own" on public.wallet_transactions
  for select using (auth.uid() = user_id);
create policy "wallet_insert_service" on public.wallet_transactions
  for insert with check (auth.uid() = user_id);

-- Likes
create policy "likes_select_all" on public.video_likes
  for select using (true);
create policy "likes_insert_own" on public.video_likes
  for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.video_likes
  for delete using (auth.uid() = user_id);

-- Trigger: criar profile ao registrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage: crie o bucket público `videos` no Dashboard (Storage) para uploads do Admin.
-- (Nome configurável na app: NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET; legado: `media`.)
-- Políticas sugeridas: leitura pública; escrita apenas para autenticados admin
-- (ajuste via SQL de storage.objects ou políticas na UI).
