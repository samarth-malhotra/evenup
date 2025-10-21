CREATE OR REPLACE FUNCTION match_contact_hashes(hashes text[])
RETURNS TABLE (
  profile_id uuid,
  phone_hash text,
  email_hash text,
  status text,
  nickname text,   -- Changed to nickname if display_name is incorrect
  avatar_url text,
  updated_at timestamptz
) LANGUAGE sql STABLE AS $$
SELECT id::uuid AS profile_id,
       phone_hash,
       email_hash,
       status,
       nickname,      -- Changed to nickname
       avatar_url,
       updated_at
FROM user_profiles
WHERE (phone_hash = ANY(hashes) OR email_hash = ANY(hashes));
$$;

