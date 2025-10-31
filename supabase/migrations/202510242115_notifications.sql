-- Option A: CREATE new notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                    -- recipient
  group_id uuid,                            -- optional: group related to the activity
  actor_id uuid,                            -- user who caused the activity (optional)
  activity_type text NOT NULL,              -- e.g. 'member_added', 'member_removed', 'group_deleted', 'transaction_created', 'transaction_updated'
  title text NOT NULL,
  body text,
  data jsonb,                               -- arbitrary metadata for client (expense id, amounts, etc.)
  link text,                                -- optional deep-link / route in app
  read boolean NOT NULL DEFAULT false,
  push_sent boolean NOT NULL DEFAULT false,
  push_response jsonb,                      -- store push receipts / response for debugging
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT fk_notifications_user_profiles FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE
);