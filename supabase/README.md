# Supabase – Mirage Fantasy

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (se ainda não tiver).
2. **New project** → escolha nome, senha do banco (guarde essa senha) e região.
3. Aguarde o projeto ficar pronto.

## 2. Rodar o SQL (tabelas e políticas)

1. No dashboard do projeto: **SQL Editor** → **New query**.
2. Copie todo o conteúdo do arquivo `migrations/20250315000000_initial.sql`.
3. Cole no editor e clique em **Run**.
4. Confirme que a mensagem indica sucesso.

## 3. Configurar o site

1. No dashboard: **Settings** (ícone de engrenagem) → **API**.
2. Copie:
   - **Project URL**
   - **anon public** (chave pública, não a secret).
3. No seu projeto, abra o arquivo **`supabase-config.js`** na raiz.
4. Preencha:

```javascript
window.MIRAGE_SUPABASE_URL = 'https://SEU_PROJECT_REF.supabase.co';
window.MIRAGE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...';
```

Salve o arquivo. O site passará a usar Supabase para:

- **Cadastro e login** (Auth)
- **Compras e coleção** (tabelas `purchases` e `collection_cards`)
- **Checkout** (registro de pagamento)
- **Admin** (senha em `admin_config`; conteúdo em `content_entries`)

## 4. Autenticação por e-mail (opcional)

Por padrão o Supabase pode exigir confirmação de e-mail. Para desativar (útil em desenvolvimento):

- **Authentication** → **Providers** → **Email** → desative **Confirm email**.

## 5. Trocar a senha do admin

No **SQL Editor** do Supabase:

```sql
UPDATE public.admin_config SET value = 'sua_nova_senha' WHERE key = 'admin_password';
```

Depois use essa mesma senha na página **admin.html**.
