-- create the extension and install it into schema "pgmq"
CREATE SCHEMA IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pgmq SCHEMA pgmq;

-- creates the actual queue table pgmq.q_notifications_queue and related objects
SELECT pgmq.create('notifications_queue');

-- 2025-10-29_add_public_pgmq_wrappers.sql
-- Creates public RPC wrappers for peeking and deleting notifications from the pgmq queue,
-- makes them SECURITY DEFINER and grants EXECUTE to API roles.
-- Run this as a privileged role (DB owner / migration runner).


-- Peek wrapper: read messages without removing them.
CREATE OR REPLACE FUNCTION public.peek_notifications(limit_count integer)
RETURNS TABLE(msg_id bigint, message jsonb, enqueued_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pgmq, public, pg_catalog
AS $$
  SELECT msg_id, message, enqueued_at
  FROM pgmq.q_notifications_queue
  ORDER BY enqueued_at
  LIMIT limit_count;
$$;

-- Delete wrapper: delete by msg_id array (calls pgmq.delete)
CREATE OR REPLACE FUNCTION public.delete_notifications(msg_ids bigint[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pgmq, public, pg_catalog
AS $$
BEGIN
  -- call the pgmq delete function for this queue. Using PERFORM to run the function.
  PERFORM pgmq.delete('notifications_queue', msg_ids);
END;
$$;

-- owner should be a privileged role (e.g. the DB owner)
CREATE OR REPLACE FUNCTION public.enqueue_notifications(messages jsonb)
RETURNS SETOF bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  msgs jsonb[];
BEGIN
  SELECT array_agg(elem) INTO msgs
  FROM jsonb_array_elements(messages) AS elem;

  RETURN QUERY
    SELECT * FROM pgmq.send_batch('notifications_queue', msgs, 0);
END;
$$;

-- Allow the anon role (PostgREST) to call it
GRANT EXECUTE ON FUNCTION public.enqueue_notifications(jsonb) TO anon;


-- Grant execute so PostgREST / supabase.rpc(...) can call these wrappers.
-- Adjust roles as per your security model. service_role will always have access server-side,
-- but granting to anon/authenticated allows calling via normal anon token if needed.
GRANT EXECUTE ON FUNCTION public.peek_notifications(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_notifications(bigint[]) TO anon, authenticated, service_role;

-- Optional: ensure any existing enqueue wrapper you created is executable by API roles.
GRANT EXECUTE ON FUNCTION public.enqueue_notifications(jsonb) TO anon, authenticated, service_role;

-- If you prefer to restrict to server-side only, remove anon/authenticated and only keep service_role.
