-- Estorno manual de compra de diamantes (somente admin).
-- Passos:
-- A) Atualiza status da transação original para 'refunded'
-- B) Remove do saldo os diamantes creditados (delta > 0)
-- C) Registra linha de auditoria (type='refund') com created_by e nota

create or replace function public.refund_diamond_purchase(
  p_tx_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_uid uuid;
  v_tx record;
  v_balance integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select exists (
    select 1
    from auth.users u
    where u.id = v_uid
      and (
        (u.raw_user_meta_data->>'role') = 'admin'
        or (u.raw_user_meta_data->>'is_admin') = 'true'
      )
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'not authorized';
  end if;

  if p_tx_id is null then
    raise exception 'tx_id obrigatório';
  end if;

  -- lock da transação para evitar corridas
  select
    id,
    user_id,
    delta,
    type,
    status,
    payment_ref,
    amount,
    coalesce(pack_id, product_id) as pack_id,
    product_id
  into v_tx
  from public.diamond_transactions
  where id = p_tx_id
  for update;

  if v_tx.id is null then
    raise exception 'transação não encontrada';
  end if;

  if coalesce(v_tx.status, '') not in ('approved', 'completed') then
    raise exception 'status não permite estorno: %', coalesce(v_tx.status, 'null');
  end if;

  if v_tx.delta is null or v_tx.delta <= 0 then
    raise exception 'delta inválido para estorno';
  end if;

  -- saldo atual com lock
  select diamonds into v_balance
  from public.profiles
  where id = v_tx.user_id
  for update;

  if v_balance is null then
    raise exception 'profile não encontrado';
  end if;

  if v_balance < v_tx.delta then
    raise exception 'saldo insuficiente para estornar (% < %)', v_balance, v_tx.delta;
  end if;

  -- A) status -> refunded
  update public.diamond_transactions
  set status = 'refunded'
  where id = v_tx.id;

  -- B) remove diamantes creditados
  update public.profiles
  set diamonds = diamonds - v_tx.delta
  where id = v_tx.user_id;

  -- C) auditoria: linha extra (não substitui a original)
  insert into public.diamond_transactions (
    user_id,
    delta,
    type,
    created_by,
    payment_ref,
    amount,
    product_id,
    pack_id,
    status
  )
  values (
    v_tx.user_id,
    -v_tx.delta,
    'refund',
    v_uid,
    v_tx.payment_ref,
    v_tx.amount,
    v_tx.product_id,
    v_tx.pack_id,
    'refunded'
  );

  -- Nota opcional: registra na wallet_transactions (se existir) como log.
  if p_note is not null and btrim(p_note) <> '' then
    begin
      insert into public.wallet_transactions (user_id, amount_centavos, type, description, metadata)
      values (
        v_tx.user_id,
        0,
        'admin_refund',
        'Estorno manual de compra de diamantes',
        jsonb_build_object(
          'tx_id', v_tx.id,
          'payment_ref', v_tx.payment_ref,
          'pack_id', v_tx.pack_id,
          'delta', v_tx.delta,
          'note', p_note,
          'refunded_by', v_uid
        )
      );
    exception
      when undefined_table then
        -- tabela opcional; ignora se não existir
        null;
    end;
  end if;
end;
$$;

-- Permitir chamada para utilizadores autenticados;
-- A função valida se é admin antes de executar.
grant execute on function public.refund_diamond_purchase(uuid, text) to authenticated;

