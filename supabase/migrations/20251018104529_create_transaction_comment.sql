create or replace function public.create_transaction_comment(payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  tx_id uuid := (payload ->> 'transaction_id')::uuid;
  created_by uuid := (payload ->> 'created_by')::uuid;
  body text := payload ->> 'body';
  new_id uuid;
  created_ts timestamptz;
begin
  if tx_id is null or created_by is null or body is null or trim(body) = '' then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing required fields');
  end if;

  insert into public.transaction_comments (transaction_id, created_by, body, created_at)
  values (tx_id, created_by, body, now())
  returning id, created_at into new_id, created_ts;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', new_id,
      'transaction_id', tx_id,
      'created_by', created_by,
      'body', body,
      'created_at', to_char(created_ts, 'YYYY-MM-DD"T"HH24:MI:SSOF')
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
