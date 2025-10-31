CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Only update rows that are currently unread to avoid unnecessary writes
  UPDATE public.notifications
  SET is_read = true,
      updated_at = now()
  WHERE user_id = p_user_id
    AND is_read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Always return success with empty data array; include count in the message
  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', '[]'::jsonb,
    'message', format('Marked %s notifications as read.', updated_count)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(uuid) TO authenticated;
