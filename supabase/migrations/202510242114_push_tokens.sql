CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text CHECK (platform IN ('ios', 'android', 'web')) NOT NULL,
  device_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT fk_push_tokens_user_profiles FOREIGN KEY (user_id)
    REFERENCES public.user_profiles(id)
    ON DELETE CASCADE
);
