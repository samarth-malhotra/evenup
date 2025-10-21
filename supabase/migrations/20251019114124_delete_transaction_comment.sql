create or replace function public.delete_transaction_comment(p_comment_id uuid)
returns jsonb
language plpgsql
security definer
as $$
begin
  if p_comment_id is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing comment id');
  end if;

  delete from public.transaction_comments where id = p_comment_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Comment not found');
  end if;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object('id', p_comment_id));
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
