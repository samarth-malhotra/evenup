-- supabase/functions/update_user_profile.sql
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id uuid,
  p_nickname text DEFAULT NULL,
  p_theme theme_enum DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_row public.user_profiles%ROWTYPE;
BEGIN
  -- If caller didn't provide any updatable fields, return current row (no-op)
  IF p_nickname IS NULL AND p_theme IS NULL THEN
    SELECT up.*
    INTO updated_row
    FROM public.user_profiles up
    WHERE up.id = p_user_id
    LIMIT 1;

    IF updated_row IS NULL THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'error', 'not_found',
        'message', format('No user found for id: %s', p_user_id)
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'data', to_jsonb(updated_row),
      'message', 'no_changes'  -- indicates nothing was changed
    );
  END IF;

  -- Perform update: only change fields that are explicitly provided (IS NOT NULL).
  UPDATE public.user_profiles up
  SET
    nickname   = CASE WHEN p_nickname IS NOT NULL THEN p_nickname ELSE up.nickname END,
    theme      = CASE WHEN p_theme    IS NOT NULL THEN p_theme    ELSE up.theme    END,
    updated_at = now()
  WHERE up.id = p_user_id
  RETURNING up.* -- return entire row
  INTO updated_row;

  IF updated_row IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'not_found',
      'message', format('No user found for id: %s', p_user_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', to_jsonb(updated_row)
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

