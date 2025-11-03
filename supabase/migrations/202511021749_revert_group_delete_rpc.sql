CREATE OR REPLACE FUNCTION public.revert_group_delete(
  p_group_id uuid,
  p_user_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_affected integer;
  is_active_member boolean;
BEGIN
  -- ensure the caller was (and currently is) an active member of the group
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id  = p_user_id
      AND gm.status = 'active'
  ) INTO is_active_member;

  IF NOT is_active_member THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Not a group member',
      'message', format('User %s is not an active member of group %s', p_user_id, p_group_id)
    );
  END IF;

  -- only revert if the group is currently deleted
  UPDATE public.groups
  SET
    deleted_at  = NULL,
    reverted_by = p_user_id,
    updated_at  = now(),
    status      = 'active'
  WHERE id = p_group_id
    AND status = 'deleted';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;

  IF rows_affected = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Group not found or not deleted',
      'message', format('No deleted group found for id: %s', p_group_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Group revert successful',
    'data', jsonb_build_object('group_id', p_group_id)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Failed to revert group delete'
    );
END;
$$;
