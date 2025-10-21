CREATE OR REPLACE FUNCTION public.get_user_groups(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  groups jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(group_json), '[]'::jsonb)
  INTO groups
  FROM (
    SELECT
      jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'avatar_url', g.avatar_url,
        'created_at', g.created_at,
        'created_by', g.created_by,
        'simplified', g.simplified,
        'updated_at', g.updated_at
      ) AS group_json
    FROM groups g
    WHERE EXISTS (
      SELECT 1
      FROM group_members gm2
      WHERE gm2.group_id = g.id
        AND gm2.user_id = p_user_id
        AND gm2.left_at IS NULL
    )
    AND g.status = 'active'
    ORDER BY g.updated_at DESC
  ) t;

  RETURN jsonb_build_object(
    'ok', true,
    'data', groups
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Failed to fetch user groups'
    );
END;
$$;

