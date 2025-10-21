CREATE OR REPLACE FUNCTION public.get_friends(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  friends jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'friendship_id', f.id,
        'friend_id', CASE WHEN f.requester_id = p_user_id THEN f.friend_id ELSE f.requester_id END::text,
        'nickname', up.nickname,
        'email', up.email,
        'phone', up.phone,
        'status', up.status
      )
    ),
    '[]'::jsonb
  ) INTO friends
  FROM friendships f
  JOIN user_profiles up
    ON up.id = (CASE WHEN f.requester_id = p_user_id THEN f.friend_id ELSE f.requester_id END)::uuid
  WHERE p_user_id IN (f.requester_id, f.friend_id);

  RETURN jsonb_build_object(
    'ok', true,
    'data', friends
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'message', 'Failed to fetch friends'
  );
END;
$$;

