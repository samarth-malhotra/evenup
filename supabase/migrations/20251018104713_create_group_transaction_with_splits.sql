-- SQL: create rpc to insert transaction + splits atomically
create or replace function public.create_group_transaction_with_splits(payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  p jsonb := payload; -- canonical payload we will use
  tx_id uuid;
  t_title text;
  t_amount numeric;
  t_currency text;
  t_paid_by uuid;
  t_group_id uuid;
  t_created_by uuid;
  t_receipt_url text;
  t_status text;
  t_metadata jsonb;
  splits jsonb;
  s jsonb;
  s_user uuid;
  s_amount numeric;
  s_share_type text;
  s_share_meta jsonb;
  sum_splits numeric := 0;
  created_at_ts timestamp with time zone;
  _inner_text text;
begin
  /*
    Normalise payload shapes:
      - payload is already object => use as-is
      - payload = { "payload": <object> } => use inner object
      - payload = { "payload": "<stringified json>" } => parse inner string into jsonb
  */
  if p ? 'payload' then
    -- try to extract inner as jsonb; if inner is a JSON string (stringified JSON),
    -- casting -> try (p->>'payload')::jsonb
    begin
      -- if inner is a json value (object/array), this will succeed
      p := (p->'payload')::jsonb;
    exception when others then
      -- fallback: if inner is a string containing JSON, parse that string
      _inner_text := p->>'payload';
      if _inner_text is not null and length(btrim(_inner_text)) > 0 then
        p := _inner_text::jsonb;
      else
        -- inner payload empty -> keep original p (will fail validation later)
        p := '{}'::jsonb;
      end if;
    end;
  end if;

  -- extract fields from canonical payload 'p'
  t_title := nullif(btrim(p ->> 'title'), ''); -- treat empty string as null
  -- amount might be a number or a string, coerce safely
  begin
    t_amount := (p ->> 'amount')::numeric;
  exception when others then
    t_amount := null;
  end;
  t_currency := coalesce(p ->> 'currency', 'INR');
  begin
    t_paid_by := (p ->> 'paidBy')::uuid;
  exception when others then
    t_paid_by := null;
  end;
  begin
    t_group_id := (p ->> 'groupId')::uuid;
  exception when others then
    t_group_id := null;
  end;
  begin
    t_created_by := (p ->> 'createdBy')::uuid;
  exception when others then
    t_created_by := null;
  end;
  t_receipt_url := p ->> 'receiptUrl';
  t_status := coalesce(p ->> 'status', 'active');
  t_metadata := coalesce(p -> 'metadata', '{}'::jsonb);
  splits := p -> 'splits';

  -- Basic validation
  if t_title is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'title is required');
  end if;

  if t_amount is null or t_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'amount must be > 0');
  end if;

  if t_paid_by is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'paidBy is required');
  end if;

  if splits is null or jsonb_typeof(splits) is distinct from 'array' or jsonb_array_length(splits) = 0 then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'splits are required');
  end if;

  -- validate split objects and sum
  for s in select * from jsonb_array_elements(splits)
  loop
    begin
      s_user := (s ->> 'userId')::uuid;
    exception when others then
      s_user := null;
    end;
    begin
      s_amount := (s ->> 'amount')::numeric;
    exception when others then
      s_amount := null;
    end;
    s_share_type := coalesce(s ->> 'shareType', 'exact');
    s_share_meta := coalesce(s -> 'shareMeta', '{}'::jsonb);

    if s_user is null then
      return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'each split must have userId');
    end if;
    if s_amount is null or s_amount < 0 then
      return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'each split must have non-negative amount');
    end if;
    sum_splits := sum_splits + s_amount;
  end loop;

  -- enforce that sum of splits equals amount (tweak tolerance if you need)
  if abs(sum_splits - t_amount) > 0.01 then
    return jsonb_build_object(
      'ok', false,
      'error', 'validation_error',
      'message', format('sum of splits (%.2f) does not equal transaction amount (%.2f)', sum_splits, t_amount)
    );
  end if;

  -- create transaction
  insert into public.transactions(
    title, amount, currency, paid_by, group_id, status, receipt_url, created_by, created_at, metadata
  )
  values (
    t_title, t_amount, t_currency, t_paid_by, t_group_id, t_status, t_receipt_url, t_created_by, now(), coalesce(t_metadata, '{}'::jsonb)
  )
  returning id, created_at into tx_id, created_at_ts;

  -- insert splits
  for s in select * from jsonb_array_elements(splits)
  loop
    s_user := (s ->> 'userId')::uuid;
    s_amount := (s ->> 'amount')::numeric;
    s_share_type := coalesce(s ->> 'shareType', 'exact');
    s_share_meta := coalesce(s -> 'shareMeta', '{}'::jsonb);

    insert into public.transaction_splits(transaction_id, user_id, amount, share_type, share_meta, created_at)
    values (tx_id, s_user, s_amount, s_share_type, s_share_meta, now());
  end loop;

  -- success -> return standardized wrapper with data
  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object('transactionId', tx_id, 'createdAt', to_char(created_at_ts, 'YYYY-MM-DD"T"HH24:MI:SSOF'))
  );
exception
  when others then
    -- Return standardized error response (do NOT re-raise)
    return jsonb_build_object(
      'ok', false,
      'error', 'server_error',
      'message', coalesce(sqlerrm, 'unknown error')
    );
end;
$$;
