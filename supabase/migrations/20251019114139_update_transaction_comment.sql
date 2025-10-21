create or replace function public.update_transaction_comment(p_comment_id uuid, p_body text, p_modified_by uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  updated_ts timestamptz;
  cid uuid := p_comment_id;
begin
  if cid is null or p_body is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing params');
  end if;

  update public.transaction_comments
    set body = p_body, created_at = now()
  where id = cid
  returning id, created_at into cid, updated_ts;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Comment not found');
  end if;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'id', cid,
    'body', p_body,
    'createdAt', to_char(updated_ts, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ));
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
