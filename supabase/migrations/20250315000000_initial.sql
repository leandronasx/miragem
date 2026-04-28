-- Mirage Fantasy: tabelas e RLS para Supabase
-- Execute no SQL Editor do projeto Supabase (Dashboard > SQL Editor)

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT DEFAULT '',
  nome TEXT DEFAULT '',
  signup_ip TEXT DEFAULT '',
  diamonds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Compras (planos adquiridos)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  date DATE DEFAULT (CURRENT_DATE),
  method TEXT DEFAULT 'cartao',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cards salvos na coleção do usuário
CREATE TABLE IF NOT EXISTS public.collection_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'video',
  base TEXT NOT NULL DEFAULT '',
  src TEXT NOT NULL,
  title TEXT DEFAULT '',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Senha do admin (uma linha: key = 'admin_password', value = '1234')
CREATE TABLE IF NOT EXISTS public.admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO public.admin_config (key, value) VALUES ('admin_password', '1234')
  ON CONFLICT (key) DO NOTHING;

-- Conteúdo adicionado pelo admin (pastas/arquivos e tags)
CREATE TABLE IF NOT EXISTS public.content_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder TEXT NOT NULL,
  file_name TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_purchases_user ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_user ON public.collection_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_content_entries_folder ON public.content_entries(folder);

-- RLS: ativar
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_entries ENABLE ROW LEVEL SECURITY;

-- Políticas: profiles
-- 1) Dono pode ver/editar seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- 2) Admin via app (usando anon) precisa listar todos os perfis.
--    Isto libera leitura pública da lista de contas. Use apenas se estiver de acordo com isso.
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

-- Políticas: purchases (só o próprio usuário)
CREATE POLICY "purchases_select_own" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "purchases_insert_own" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas: collection_cards (só o próprio usuário)
CREATE POLICY "collection_cards_select_own" ON public.collection_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "collection_cards_insert_own" ON public.collection_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "collection_cards_delete_own" ON public.collection_cards FOR DELETE USING (auth.uid() = user_id);

-- admin_config: ninguém lê via tabela; só a função usa
CREATE POLICY "admin_config_no_select" ON public.admin_config FOR SELECT USING (false);

-- Função para validar senha do admin (retorna true/false sem expor a senha)
CREATE OR REPLACE FUNCTION public.check_admin_password(pwd TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (SELECT value FROM public.admin_config WHERE key = 'admin_password') = pwd;
END;
$$;

-- Permite anon e authenticated chamarem a função
GRANT EXECUTE ON FUNCTION public.check_admin_password(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_admin_password(TEXT) TO authenticated;

-- Debitar diamantes (1 geração = 35). Só o próprio usuário, e só se tiver saldo.
CREATE OR REPLACE FUNCTION public.debit_diamonds(amount INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET diamonds = diamonds - amount
  WHERE id = auth.uid() AND diamonds >= amount
  RETURNING diamonds INTO new_balance;
  RETURN COALESCE(new_balance, -1);
END;
$$;
GRANT EXECUTE ON FUNCTION public.debit_diamonds(INTEGER) TO authenticated;

-- content_entries: todos podem ler; anon/authenticated podem inserir (admin usa senha no app)
CREATE POLICY "content_entries_select_all" ON public.content_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "content_entries_insert_anon" ON public.content_entries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "content_entries_insert_authenticated" ON public.content_entries FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger: criar profile ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, signup_ip)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'signup_ip', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
