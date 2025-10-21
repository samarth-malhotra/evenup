-- File: supabase/functions/get_user_profile.sql
CREATE OR REPLACE FUNCTION public.get_user_profile_by_id(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_json jsonb;
BEGIN
  SELECT to_jsonb(up) INTO user_json
  FROM public.user_profiles up
  WHERE up.id = p_user_id
  LIMIT 1;

  IF user_json IS NULL THEN
    -- not found: return an application-level error envelope
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'not_found',
      'message', format('No user found for id: %s', p_user_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', user_json
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'internal_error',
      'message', SQLERRM
    );
END;
$$;

