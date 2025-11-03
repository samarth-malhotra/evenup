CREATE OR REPLACE FUNCTION public.get_notifications_by_user(
  p_user_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_only_unread boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  total_count int;
  unread_count int;
  filtered_total_count int;
  returned_count int;
  has_more boolean;
  next_offset int;
BEGIN
  -- Combined counts in one scan
  SELECT
    COUNT(*) FILTER (WHERE NOT (title IS NULL AND body IS NULL)) AS total_count,
    COUNT(*) FILTER (WHERE NOT (title IS NULL AND body IS NULL) AND is_read = false) AS unread_count,
    COUNT(*) FILTER (WHERE NOT (title IS NULL AND body IS NULL)
                     AND (NOT p_only_unread OR is_read = false)) AS filtered_total_count
  INTO total_count, unread_count, filtered_total_count
  FROM public.notifications
  WHERE user_id = p_user_id;

  -- Fetch the notifications page
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'notification_id', n.id,
        'title', n.title,
        'body', n.body,
        'subtype', n.subtype,
        'is_read', n.is_read,
        'created_at', n.created_at,
        'meta', n.data
      )
    ),
    '[]'::jsonb
  )
  INTO result
  FROM (
    SELECT id, title, body, subtype, is_read, created_at, data
    FROM public.notifications
    WHERE user_id = p_user_id
      AND NOT (title IS NULL AND body IS NULL)
      AND (NOT p_only_unread OR is_read = false)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) n;

  returned_count := COALESCE(jsonb_array_length(result), 0);
  has_more := (p_offset + returned_count) < filtered_total_count;
  next_offset := CASE WHEN has_more THEN (p_offset + returned_count) ELSE NULL END;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', jsonb_build_object(
      'total', total_count,
      'unread', unread_count,
      'notifications', result,
      'pagination', jsonb_build_object(
        'limit', p_limit,
        'offset', p_offset,
        'count', returned_count,
        'has_more', has_more,
        'next_offset', next_offset
      )
    ),
    'message', format(
      'Fetched %s notifications (limit=%s, offset=%s, only_unread=%s)',
      returned_count,
      p_limit,
      p_offset,
      p_only_unread
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notifications_by_user(uuid, int, int, boolean) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created_at
  ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;


