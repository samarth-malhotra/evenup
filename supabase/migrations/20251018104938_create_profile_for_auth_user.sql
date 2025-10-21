-- Requires pgcrypto
create extension if not exists pgcrypto;

create or replace function public.create_profile_for_auth_user(
  p_uid uuid,
  p_email text,
  p_phone text,
  p_nickname text default null,
  p_metadata jsonb default null,
  p_theme theme_enum default 'light',
  p_language text default 'en',
  p_currency text default 'INR',
  p_invited_by uuid default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_email_hash text := null;
  v_phone_hash text := null;
begin
  -- normalize inputs (lowercase email, trim phone)
  if p_email is not null then
    v_email_hash := encode(digest(lower(trim(p_email))::bytea, 'sha256'), 'hex');
  end if;

  if p_phone is not null then
    v_phone_hash := encode(digest(trim(p_phone)::bytea, 'sha256'), 'hex');
  end if;

  -- insert profile (adjust columns to match your schema)
  insert into public.user_profiles (
    id,
    email,
    phone,
    avatar_url,
    currency,
    language,
    theme,
    nickname,
    status,
    invited_by,
    last_active_at,
    metadata,
    phone_hash,
    email_hash
  ) values (
    p_uid,
    p_email,
    p_phone,
    null,
    p_currency,
    p_language,
    p_theme,
    p_nickname,
    'active',
    p_invited_by,
    null,
    p_metadata,
    v_phone_hash,
    v_email_hash
  );

  return jsonb_build_object('ok', true, 'message', 'profile_created', 'user_id', p_uid);

exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'db_conflict', 'message', sqlerrm);
  when others then
    return jsonb_build_object('ok', false, 'error', 'db_error', 'message', sqlerrm);
end;
$$;

