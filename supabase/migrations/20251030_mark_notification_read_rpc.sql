CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_user_id uuid,
  p_notification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Update the matching notification
  UPDATE public.notifications
  SET is_read = true,
      updated_at = now()
  WHERE id = p_notification_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- No matching row found
  IF updated_count = 0 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'not_found',
      'data', '[]'::jsonb,
      'message', 'No notification found for the given user and ID.'
    );
  END IF;

  -- Success response with notification_id
  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', jsonb_build_object(
      'notification_id', p_notification_id
    ),
    'message', 'Notification marked as read.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid, uuid) TO authenticated;
