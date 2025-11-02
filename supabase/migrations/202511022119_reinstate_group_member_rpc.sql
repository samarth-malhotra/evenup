CREATE OR REPLACE FUNCTION public.reinstate_group_member(
  p_group_id uuid,
  p_user_id uuid,           -- the user performing the reinstatement
  p_deleted_user_id uuid    -- the member being reinstated
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  gm_row public.group_members%ROWTYPE;
  group_status_text text;
  performer_is_active boolean;
BEGIN
  -- 1) Check if the group exists and is active
  SELECT status::text INTO group_status_text
  FROM public.groups
  WHERE id = p_group_id;

  IF NOT FOUND OR group_status_text IS NULL OR group_status_text <> 'active' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'group_not_active_or_missing',
      'message', format('Group %s does not exist or is not active', p_group_id)
    );
  END IF;

  -- 2) Verify the performer (revoker) is an active member
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id  = p_user_id
      AND gm.status = 'active'
  ) INTO performer_is_active;

  IF NOT performer_is_active THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'performer_not_active_member',
      'message', format('User %s is not an active member of group %s and cannot reinstate others', p_user_id, p_group_id)
    );
  END IF;

  -- 3) Reinstate the deleted/left user
  UPDATE public.group_members
  SET
    status     = 'active'::public.group_member_status_enum,
    removed_by = NULL,
    left_at    = NULL
  WHERE group_id = p_group_id
    AND user_id  = p_deleted_user_id
  RETURNING * INTO gm_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_existing_member_row',
      'message', format('No existing membership found for group %s and user %s — cannot reinstate', p_group_id, p_deleted_user_id)
    );
  END IF;

  -- 4) Return success response
  RETURN jsonb_build_object(
    'ok', true,
    'message', format('User %s successfully reinstated to group %s by %s', p_deleted_user_id, p_group_id, p_user_id),
    'data', to_jsonb(gm_row)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Failed to reinstate group member'
    );
END;
$$;
