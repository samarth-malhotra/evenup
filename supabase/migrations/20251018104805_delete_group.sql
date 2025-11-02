create or replace function public.delete_group(
  p_group_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  rows_affected integer;
begin
  update public.groups
  set 
    deleted_by = p_user_id,
    deleted_at = now(),
    reverted_by  = NULL,
    status = 'deleted'
  where id = p_group_id;

  get diagnostics rows_affected = row_count;

  if rows_affected = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Group not found',
      'message', format('No group found for id: %s', p_group_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Group deleted successfully',
    'data', jsonb_build_object('group_id', p_group_id)
  );

exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Failed to delete group'
    );
end;
$$;
