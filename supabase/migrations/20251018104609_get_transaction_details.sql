create or replace function public.get_transaction_details(p_tx_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  tx record;
  parts jsonb;
  cmts jsonb;
begin
  select t.*, coalesce(up.nickname, up.email, up.phone, 'Unknown') as payer_name, up.avatar_url as payer_avatar
  into tx
  from public.transactions t
  left join public.user_profiles up on up.id = t.paid_by
  where t.id = p_tx_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Transaction not found');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', ts.user_id,
    'amount', ts.amount,
    'shareType', ts.share_type,
    'name', coalesce(up.nickname, up.email, up.phone, 'Unknown'),
    'avatar_url', up.avatar_url
  ) order by ts.created_at), '[]'::jsonb) into parts
  from public.transaction_splits ts
  left join public.user_profiles up on up.id = ts.user_id
  where ts.transaction_id = p_tx_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'userId', c.created_by,
    'user', coalesce(u.nickname, u.email, u.phone, 'Unknown'),
    'message', c.body,
    'createdAt', to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ) order by c.created_at desc), '[]'::jsonb) into cmts
  from public.transaction_comments c
  left join public.user_profiles u on u.id = c.created_by
  where c.transaction_id = p_tx_id;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', tx.id,
      'title', tx.title,
      'amount', tx.amount,
      'currency', tx.currency,
      'paidBy', tx.paid_by,
      'paidByName', tx.payer_name,
      'paidByAvatar', tx.payer_avatar,
      'date', to_char(tx.created_at, 'YYYY-MM-DD'),
      'splitMethod', (tx.metadata ->> 'splitMethod')::text,
      'participants', parts,
      'comments', cmts
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
