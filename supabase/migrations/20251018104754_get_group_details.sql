CREATE OR REPLACE FUNCTION public.get_group_details(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  effective_user uuid;
  group_exists boolean;
  member_exists boolean;
  result jsonb;
BEGIN
  -- Determine caller user id (prefer auth.uid() in Supabase)
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
      'message', 'No user identity available in JWT. Ensure the request includes a valid Supabase access token.'
    );
  END IF;

  -- 1) Check that the group exists and is active
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id
      AND g.status = 'active'
  ) INTO group_exists;

  IF NOT group_exists THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'group_not_found_or_inactive',
      'message', 'Group not found or not active.'
    );
  END IF;

  -- 2) Check active membership (only after confirming group exists)
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = effective_user
      AND gm.left_at IS NULL
      AND (gm.status IS NULL OR gm.status NOT IN ('deleted','left'))
  ) INTO member_exists;

  IF NOT member_exists THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_a_group_member',
      'message', 'You are not a member of this group.'
    );
  END IF;

  -- 3) Build and return the group object
  SELECT jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'avatar_url', g.avatar_url,
    'simplified', g.simplified,
    'members',
      COALESCE(
        (
          SELECT jsonb_agg(member_obj)
          FROM (
            SELECT
              jsonb_build_object(
                'id', up.id,
                'name', up.nickname,
                'phone', up.phone,
                'email', up.email,
                'avatar_url', up.avatar_url,
                'currency', up.currency,
                'language', up.language,
                'account_status', up.status,
                'status_in_group', gm.status,
                'role', gm.role,
                'joined_at', gm.joined_at
              ) AS member_obj
            FROM public.group_members gm
            JOIN public.user_profiles up ON up.id = gm.user_id
            WHERE gm.group_id = g.id
              AND gm.left_at IS NULL
            ORDER BY
              (gm.role = 'owner') DESC,
              gm.joined_at NULLS LAST
          ) sub
        ), '[]'::jsonb
      )
  ) INTO result
  FROM public.groups g
  WHERE g.id = p_group_id
    AND g.status = 'active';

  -- Should be found since we checked earlier, but keep the guard
  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'group_not_found_or_inactive',
      'message', 'Group not found or not active.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', result);
END;
$$;

