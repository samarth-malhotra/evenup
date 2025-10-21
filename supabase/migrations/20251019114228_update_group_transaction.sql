create or replace function public.update_group_transaction(p_tx_id uuid, payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  t record;
  modified_ts timestamptz;
  new_title text := payload ->> 'title';
  new_amount numeric := nullif(payload ->> 'amount','')::numeric;
  new_metadata jsonb := payload -> 'metadata';
begin
  if p_tx_id is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing tx id');
  end if;

  update public.transactions set
    title = coalesce(new_title, title),
    amount = coalesce(new_amount, amount),
    metadata = coalesce(new_metadata, metadata),
    modified_at = now()
  where id = p_tx_id
  returning id, title, amount, currency, paid_by, created_at, modified_at into t;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Transaction not found');
  end if;

  modified_ts := t.modified_at;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'amount', t.amount,
    'paidBy', t.paid_by,
    'modifiedAt', to_char(modified_ts, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ));
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
