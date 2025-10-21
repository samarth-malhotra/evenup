CREATE OR REPLACE FUNCTION public.delete_group_member(
  p_group_id uuid,
  p_user_id uuid,
  p_removed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  updated_row public.group_members%ROWTYPE;
  -- declare variable using the same type as the table's status column
  new_status public.group_members.status%TYPE;
BEGIN
  -- Determine status based on who removed the user
  IF p_user_id = p_removed_by THEN
    new_status := 'left'::public.group_member_status_enum;
  ELSE
    new_status := 'deleted'::public.group_member_status_enum;
  END IF;

  UPDATE public.group_members
  SET
    status = new_status,
    removed_by = p_removed_by,
    left_at = now()
  WHERE
    group_id = p_group_id
    AND user_id = p_user_id
    AND left_at IS NULL
    AND (status IS NULL OR status NOT IN (
      'deleted'::public.group_member_status_enum,
      'left'::public.group_member_status_enum
    ))
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_matching_active_member',
      'message', 'No active group_member row found for the given group_id and user_id'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'data', to_jsonb(updated_row)
  );
END;
$$;

