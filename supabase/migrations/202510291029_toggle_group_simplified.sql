CREATE OR REPLACE FUNCTION public.toggle_group_simplified(
  p_group_id uuid,
  p_simplified boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  effective_user uuid;
  is_member boolean;
  updated jsonb;
BEGIN
  BEGIN
    effective_user := auth.uid();
  EXCEPTION WHEN others THEN
    effective_user := NULL;
  END;

  IF effective_user IS NULL THEN
    BEGIN
      effective_user := (current_setting('request.jwt.claims.sub', true))::uuid;
    EXCEPTION WHEN others THEN
      effective_user := NULL;
    END;
  END IF;

  IF effective_user IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_user_identified',
      'message', 'Missing user identity in JWT.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = effective_user
      AND gm.left_at IS NULL
      AND (gm.status IS NULL OR gm.status NOT IN ('deleted','left'))
  ) INTO is_member;

  IF NOT is_member THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_a_group_member',
      'message', 'You are not a member of this group.'
    );
  END IF;

  UPDATE public.groups
  SET simplified = p_simplified,
      updated_at = now()
  WHERE id = p_group_id
    AND status = 'active'
  RETURNING jsonb_build_object(
    'id', id,
    'simplified', simplified,
    'updated_at', to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ) INTO updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'group_not_found_or_inactive',
      'message', 'Group not found or inactive.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'message', format('Simplified flag updated to %s', p_simplified),
    'data', updated
  );
END;
$$;
