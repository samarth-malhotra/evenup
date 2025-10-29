-- create or replace to allow re-run safely
create or replace function public.update_group_transaction_with_splits(
  p_tx_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_tx_id uuid := p_tx_id;
  v_title text := coalesce(p_payload->>'title', null);
  v_amount numeric := nullif((p_payload->>'amount')::numeric, null);
  v_currency text := coalesce(p_payload->>'currency', null);
  v_paid_by uuid := coalesce((p_payload->>'paidBy')::uuid, null);
  v_metadata jsonb := coalesce(p_payload->'metadata', '{}'::jsonb);
  v_splits jsonb := coalesce(p_payload->'splits', '[]'::jsonb);
  v_now timestamptz := now();
  v_total numeric := 0;
  v_row jsonb;
begin
  if v_tx_id is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing tx id');
  end if;

  -- Basic validation
  if v_amount is not null and v_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Amount must be > 0');
  end if;

  -- If splits present, validate sum >= 0 and totals reasonable
  if jsonb_array_length(v_splits) > 0 then
    v_total := 0;
    for v_row in select * from jsonb_array_elements(v_splits)
    loop
      v_total := v_total + coalesce((v_row->>'amount')::numeric, 0);
      if (v_row->>'userId') is null then
        return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Split userId missing');
      end if;
    end loop;

    if v_amount is not null and abs(v_total - v_amount) > 0.01 then
      return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Split total does not match amount');
    end if;
  end if;

  -- Update core fields
  update public.transactions
  set
    title = coalesce(v_title, title),
    amount = coalesce(v_amount, amount),
    currency = coalesce(v_currency, currency),
    paid_by = coalesce(v_paid_by, paid_by),
    metadata = coalesce(metadata, '{}'::jsonb) || v_metadata,
    modified_at = v_now
  where id = v_tx_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Transaction not found');
  end if;

  -- Replace splits if provided
  if jsonb_array_length(v_splits) > 0 then
    delete from public.transaction_splits where transaction_id = v_tx_id;

    insert into public.transaction_splits (transaction_id, user_id, amount, share_type, share_meta)
    select
      v_tx_id,
      (elem->>'userId')::uuid,
      (elem->>'amount')::numeric,
      coalesce(elem->>'shareType', 'exact'),
      coalesce(elem->'shareMeta', '{}'::jsonb)
    from jsonb_array_elements(v_splits) as elem;
  end if;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'id', v_tx_id,
    'updatedAt', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ));
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
