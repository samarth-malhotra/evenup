-- Enable pgcrypto for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'push_platform_t') THEN
    CREATE TYPE push_platform_t AS ENUM ('ios', 'android', 'web');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status_t') THEN
    CREATE TYPE delivery_status_t AS ENUM ('pending','sending','success','failed');
  END IF;
END$$;

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- recipient - fk to user_profiles(id)
  group_id uuid,
  actor_id uuid,
  activity_type text NOT NULL,
  title text,
  body text,
  data jsonb DEFAULT '{}'::jsonb,
  link text,
  read boolean DEFAULT false,
  push_sent boolean DEFAULT false,
  push_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- push_tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform push_platform_t NOT NULL,
  device_name text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_group_created ON notifications (group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON push_tokens (user_id, active);

ALTER TABLE push_tokens
  ADD CONSTRAINT push_tokens_user_device_unique UNIQUE (user_id, device_name);

-- (Optional) Add index on last_seen to help pruning queries later
CREATE INDEX IF NOT EXISTS push_tokens_last_seen_idx ON push_tokens (last_seen);

ALTER TABLE public.notifications
DROP COLUMN IF EXISTS group_id,
DROP COLUMN IF EXISTS attempted_at;
ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;