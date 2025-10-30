-- 2025-10-28_create_notifications.sql
-- Creates: notification_templates, notifications, trigger to update updated_at, and indexes.
-- NOTE: This file assumes pgcrypto (gen_random_uuid) is available (Supabase default). 
-- If not, replace gen_random_uuid() with uuid_generate_v4() if your DB has that extension.

BEGIN;

-- === 1) notification_templates (locale-aware templates) ===
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  locale text NOT NULL,                -- language code, e.g. 'en', 'hi'
  subtype text NOT NULL,               -- NotificationSubtype (e.g. 'expense_created')
  title_template text NOT NULL,        -- handlebars/mustache-style template
  body_template text NOT NULL,         -- handlebars/mustache-style template
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_templates_pkey PRIMARY KEY (id)
);

-- Unique lookup by (subtype, locale) so worker can fetch quickly
CREATE UNIQUE INDEX IF NOT EXISTS ux_notification_templates_subtype_locale
  ON public.notification_templates (subtype, locale);


-- === 2) notifications (single unified table for UI + delivery logs) ===
-- One row per recipient user. Contains rendered title/body and delivery metadata.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  -- Logical group id connecting multiple recipients for the same event (optional)
  notification_group_id uuid,

  -- Who initiated the event (nullable for system)
  actor_id uuid,

  -- Group context (nullable for system level notifications)
  group_id uuid,

  -- Subtype of notification (your NotificationSubtype)
  subtype text NOT NULL,

  -- Recipient user (this row represents the notification for this user)
  user_id uuid NOT NULL,

  -- Rendered copy (filled by worker before/after send)
  title text,
  body text,

  -- Event payload + useful fields for UI deep linking (transaction_id, you_owe, etc.)
  data jsonb DEFAULT '{}'::jsonb,

  -- Locale used when rendering title/body
  locale text DEFAULT 'en',

  -- Delivery fields (single-row-per-user model). If user has multiple tokens,
  -- worker should put per-device info inside expo_response JSON.
  device_token text,            -- primary token used (optional)
  platform text,                -- 'expo' | 'ios' | 'android' etc.
  ticket_id text,               -- expo ticket id (if provided)
  expo_response jsonb,          -- full expo response / per-device tickets / errors

  -- Status: 'pending'|'delivered'|'failed'|'no_device'|'not_registered'|'actor'
  status text NOT NULL DEFAULT 'pending',

  attempted_at timestamptz,     -- when worker tried to send
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- === 3) Indexes for common queries ===
-- Query notifications for app bell: by user_id and created_at desc
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications (user_id, created_at DESC);

-- Query by group (for admin views or aggregated UI)
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON public.notifications (group_id);

-- Query by notification_group_id for grouping or bulk ops
CREATE INDEX IF NOT EXISTS idx_notifications_grouping ON public.notifications (notification_group_id);

-- Query by status for cron receipt checker, worker, or admin dashboards
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications (status);

-- Index for ticket lookup (fast lookup by ticket during receipt check)
CREATE INDEX IF NOT EXISTS idx_notifications_ticket_id ON public.notifications (ticket_id);

-- === 4) Trigger to keep updated_at current ===
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notifications_set_updated_at ON public.notification_templates;
CREATE TRIGGER trg_notification_templates_set_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE PROCEDURE public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_notifications_set_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE PROCEDURE public.fn_set_updated_at();


-- === 5) Optional helper view: unread_count per user (if you add is_read later adjust) ===
-- NOTE: we haven't defined is_read in this migration. Keep this as a commented example for future:
-- CREATE VIEW public.v_notification_counts AS
-- SELECT user_id, count(*) FILTER (WHERE status != 'actor') AS total_notifications
-- FROM public.notifications
-- GROUP BY user_id;

COMMIT;
