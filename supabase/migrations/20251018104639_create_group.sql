-- OPTIONAL: create a low-privilege role to own the function (run as a DBA)
-- CREATE ROLE app_functions NOINHERIT; -- no login, minimal privileges; run this as a superuser

-- Create or replace the RPC
CREATE OR REPLACE FUNCTION public.create_group(
  name      text,
  avatar_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _group_record public.groups%ROWTYPE;
BEGIN
  -- auth check
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  -- inviter profile must exist
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inviter profile not found');
  END IF;

  -- validate name
  IF name IS NULL OR length(trim(name)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Group name is required');
  END IF;

  -- Insert group (handle unique constraint and other DB errors gracefully)
  BEGIN
    INSERT INTO public.groups (name, avatar_url, created_by)
    VALUES (trim(name), avatar_url, _uid)
    RETURNING * INTO _group_record;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Group with this name already exists');
    WHEN others THEN
      RETURN jsonb_build_object('ok', false, 'error', sqlerrm);
  END;

  -- Attempt to insert owner member; non-fatal — log a notice if it fails
  BEGIN
    INSERT INTO public.group_members (group_id, user_id, role, invited_by)
    VALUES (_group_record.id, _uid, 'owner', _uid);
  EXCEPTION
    WHEN others THEN
      -- NOTE: NOTICE is visible in DB logs but not returned to client; keeps RPC response clean
      RAISE NOTICE 'create_group_rpc: group_members insert warning: %', sqlerrm;
      -- continue and return success for group creation
  END;

  -- Success
  RETURN jsonb_build_object(
    'ok', true,
    'data', row_to_json(_group_record),
    'message', 'Group created successfully'
  );

EXCEPTION
  WHEN others THEN
    -- generic fallback; avoid leaking internal details but return something useful
    RETURN jsonb_build_object('ok', false, 'error', sqlerrm);
END;
$$;

