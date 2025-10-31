CREATE OR REPLACE FUNCTION public.get_notifications_by_user(
  p_user_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_status text DEFAULT NULL,
  p_only_unread boolean DEFAULT false  -- if true, return only unread notifications
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  total_count int;
  unread_count int;
  filtered_total_count int; -- total matching fetch filters (used for pagination)
  returned_count int;       -- number of notifications returned in current page
  has_more boolean;
  next_offset int;
BEGIN
  -- Total count excluding title+body null rows (independent of p_only_unread)
  SELECT COUNT(*) INTO total_count
  FROM public.notifications
  WHERE user_id = p_user_id
    AND (p_status IS NULL OR status = p_status)
    AND NOT (title IS NULL AND body IS NULL);

  -- Unread count (excluding title+body null rows)
  SELECT COUNT(*) INTO unread_count
  FROM public.notifications
  WHERE user_id = p_user_id
    AND (p_status IS NULL OR status = p_status)
    AND NOT (title IS NULL AND body IS NULL)
    AND is_read = false;

  -- Count of rows matching the fetch-time filters (this respects p_only_unread)
  SELECT COUNT(*) INTO filtered_total_count
  FROM public.notifications
  WHERE user_id = p_user_id
    AND (p_status IS NULL OR status = p_status)
    AND NOT (title IS NULL AND body IS NULL)
    AND (NOT p_only_unread OR is_read = false);

  -- Fetch the actual notifications page
  SELECT jsonb_agg(
    jsonb_build_object(
      'notification_id', n.id,
      'title', n.title,
      'body', n.body,
      'subtype', n.subtype,
      'status', n.status,
      'is_read', n.is_read,
      'created_at', n.created_at
    ) ORDER BY n.created_at DESC
  )
  INTO result
  FROM (
    SELECT id, title, body, subtype, status, is_read, created_at
    FROM public.notifications
    WHERE user_id = p_user_id
      AND (p_status IS NULL OR status = p_status)
      AND NOT (title IS NULL AND body IS NULL)
      AND (NOT p_only_unread OR is_read = false)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) n;

  -- Ensure result is never null
  result := COALESCE(result, '[]'::jsonb);
  returned_count := COALESCE(jsonb_array_length(result), 0);

  -- Pagination calculations: are there more rows beyond this page?
  has_more := (p_offset + returned_count) < filtered_total_count;
  next_offset := CASE WHEN has_more THEN (p_offset + returned_count) ELSE NULL END;

  -- Return enriched JSON response with pagination
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
      'Fetched %s notifications (limit=%s, offset=%s, status=%s, only_unread=%s)',
      returned_count,
      p_limit,
      p_offset,
      COALESCE(p_status, 'all'),
      p_only_unread
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notifications_by_user(uuid, int, int, text, boolean) TO authenticated;
