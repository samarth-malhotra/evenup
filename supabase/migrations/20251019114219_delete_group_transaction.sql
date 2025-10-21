create or replace function public.delete_group_transaction(p_tx_id uuid, performed_by uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  updated_id uuid;
begin
  if p_tx_id is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing tx id');
  end if;

  update public.transactions
    set status = 'deleted', modified_at = now(), modified_by = performed_by
  where id = p_tx_id
  returning id into updated_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Transaction not found');
  end if;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object('id', updated_id));
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;
