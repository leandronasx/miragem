-- Se você criou `public.videos` só com id/title/video_url, rode estes ADD COLUMN
-- para ficar alinhado ao app (Explore, Compra, Admin).

alter table public.videos add column if not exists prompt text not null default '';
alter table public.videos add column if not exists poster_url text not null default '';
alter table public.videos add column if not exists price_centavos int not null default 999;
alter table public.videos add column if not exists is_published boolean not null default true;
alter table public.videos add column if not exists created_at timestamptz not null default now();

-- Depois: Dashboard → API → Reload schema (ou aguarde o cache do PostgREST atualizar).
