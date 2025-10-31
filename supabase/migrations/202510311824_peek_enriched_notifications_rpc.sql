CREATE OR REPLACE FUNCTION try_cast_jsonb(input_text text)
RETURNS jsonb AS $$ BEGIN RETURN input_text::jsonb; EXCEPTION
WHEN others THEN RETURN NULL; END; $$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.peek_enriched_notifications(limit_count integer DEFAULT 100)
RETURNS TABLE (
  msg_id bigint,
  notification_id uuid,
  subtype text,
  locale text,
  user_id uuid,
  actor_id uuid,
  member_id uuid,
  group_id uuid,
  data jsonb,
  notification_row jsonb,
  actor_profile jsonb,
  user_profile jsonb,
  member_profile jsonb,
  group_obj jsonb,
  tokens jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
WITH raw AS (
  SELECT
    q.msg_id,
    q.message,
    pg_typeof(q.message) AS message_pg_type,
    -- normalized_message (safe: only call jsonb_typeof when we already know it's jsonb)
    CASE
      WHEN pg_typeof(q.message)::text = 'jsonb' THEN
        CASE
          WHEN jsonb_typeof(q.message) = 'string' THEN try_cast_jsonb(q.message #>> '{}')
          ELSE q.message
        END
      WHEN pg_typeof(q.message)::text IN ('text','varchar') THEN
        try_cast_jsonb(trim(both '"' FROM q.message::text))
      ELSE NULL
    END AS normalized_message
  FROM public.peek_notifications(limit_count) q
),
extracted AS (
  SELECT
    r.*,
    COALESCE(
      (r.normalized_message ->> 'notification_id'),
      (r.normalized_message -> 'notification' ->> 'id'),
      (r.normalized_message -> 'payload' ->> 'notification_id'),
      (r.normalized_message ->> 'id')
    ) AS extracted_notification_id_text
  FROM raw r
),
base AS (
  SELECT
    e.msg_id,
    CASE WHEN e.extracted_notification_id_text IS NOT NULL AND e.extracted_notification_id_text <> '' THEN (e.extracted_notification_id_text)::uuid ELSE NULL END AS notification_id,
    n.subtype,
    n.locale,
    n.user_id,
    n.actor_id,
    CASE
      WHEN n.data ? 'memberId' THEN (n.data->>'memberId')::uuid
      WHEN n.data ? 'member_id' THEN (n.data->>'member_id')::uuid
      WHEN e.normalized_message ? 'memberId' THEN (e.normalized_message->>'memberId')::uuid
      WHEN e.normalized_message ? 'member_id' THEN (e.normalized_message->>'member_id')::uuid
      WHEN e.normalized_message->'notification' ? 'memberId' THEN (e.normalized_message->'notification'->>'memberId')::uuid
      ELSE NULL
    END AS member_id,
    CASE
      WHEN n.data ? 'groupId' THEN (n.data->>'groupId')::uuid
      WHEN n.data ? 'group_id' THEN (n.data->>'group_id')::uuid
      WHEN e.normalized_message ? 'groupId' THEN (e.normalized_message->>'groupId')::uuid
      WHEN e.normalized_message ? 'group_id' THEN (e.normalized_message->>'group_id')::uuid
      WHEN e.normalized_message->'notification' ? 'groupId' THEN (e.normalized_message->'notification'->>'groupId')::uuid
      ELSE NULL
    END AS group_id,
    n.data,
    to_jsonb(n.*) AS notification_row,
    to_jsonb(a.*) AS actor_row_jsonb,
    to_jsonb(u.*) AS user_row_jsonb,
    to_jsonb(m.*) AS member_row_jsonb,
    t.token,
    t.platform
  FROM extracted e
  LEFT JOIN notifications n ON (n.id = CASE WHEN e.extracted_notification_id_text IS NOT NULL AND e.extracted_notification_id_text <> '' THEN (e.extracted_notification_id_text)::uuid ELSE NULL END)
  LEFT JOIN user_profiles a ON (a.id = n.actor_id)
  LEFT JOIN user_profiles u ON (u.id = n.user_id)
  LEFT JOIN user_profiles m ON (
    m.id = CASE
      WHEN n.data ? 'memberId' THEN (n.data->>'memberId')::uuid
      WHEN n.data ? 'member_id' THEN (n.data->>'member_id')::uuid
      WHEN e.normalized_message ? 'memberId' THEN (e.normalized_message->>'memberId')::uuid
      WHEN e.normalized_message ? 'member_id' THEN (e.normalized_message->>'member_id')::uuid
      WHEN e.normalized_message->'notification' ? 'memberId' THEN (e.normalized_message->'notification'->>'memberId')::uuid
      ELSE NULL
    END
  )
  LEFT JOIN push_tokens t ON (t.user_id = n.user_id AND t.active IS TRUE)
)
SELECT
  b.msg_id,
  b.notification_id,
  b.subtype,
  b.locale,
  b.user_id,
  b.actor_id,
  b.member_id,
  b.group_id,
  b.data,
  b.notification_row,
  b.actor_row_jsonb  AS actor_profile,
  b.user_row_jsonb   AS user_profile,
  b.member_row_jsonb AS member_profile,
  to_jsonb(g.*)      AS group_obj,
  COALESCE(
    jsonb_agg(jsonb_build_object('token', b.token, 'platform', b.platform)) FILTER (WHERE b.token IS NOT NULL),
    '[]'::jsonb
  ) AS tokens
FROM base b
LEFT JOIN groups g ON (g.id = b.group_id)
GROUP BY
  b.msg_id, b.notification_id, b.subtype, b.locale,
  b.user_id, b.actor_id, b.member_id, b.group_id,
  b.data, b.notification_row, b.actor_row_jsonb, b.user_row_jsonb, b.member_row_jsonb,
  g.id, g.name
ORDER BY b.msg_id ASC;
$$;
