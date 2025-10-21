-- requires pgcrypto
create extension if not exists pgcrypto;

create or replace function public.create_group_invite(
  _inviter_profile_id uuid,
  _group_id uuid,
  _placeholder_profile_id uuid, -- pass uuid if you already created auth user or found existing profile, else null
  _phone text,
  _email text,
  _contact_name text,
  _invite_channel text,
  _invite_flow text default 'share',
  _inviter_source text default null, -- 'phone' or 'email' (optional)
  _invite_expires_days int default 7,
  _app_invite_base_url text default 'evenup://invite'
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_phone_hash text := null;
  v_email_hash text := null;
  v_invite_token text := null;
  v_invite_sent_at timestamptz := now();
  v_invite_expires_at timestamptz := now() + (_invite_expires_days || ' days')::interval;
  v_meta jsonb;
  v_friend_id uuid := _placeholder_profile_id;
begin
  -- compute hashes if present
  if _phone is not null then
    v_phone_hash := encode(digest(_phone, 'sha256'), 'hex');
  end if;
  if _email is not null then
    v_email_hash := encode(digest(_email, 'sha256'), 'hex');
  end if;

  -- If no placeholder_profile_id provided, try to find existing profile by hash
  if v_friend_id is null then
    if v_phone_hash is not null then
      select id into v_friend_id from user_profiles where phone_hash = v_phone_hash limit 1;
    end if;

    if v_friend_id is null and v_email_hash is not null then
      select id into v_friend_id from user_profiles where email_hash = v_email_hash limit 1;
    end if;

    -- If still null, create a placeholder profile row
    if v_friend_id is null then
      insert into user_profiles (
        nickname, email, phone, avatar_url, invited_by, phone_hash, email_hash,
        status, metadata
      ) values (
        _contact_name, _email, _phone, null, _inviter_profile_id, v_phone_hash, v_email_hash,
        'invited',
        jsonb_build_object('placeholder', true, 'contact_name', _contact_name, 'canonical_phone', _phone)
      ) returning id into v_friend_id;
    end if;
  end if;

  -- generate invite token via existing RPC
  -- attempt to handle multiple possible shapes returned by generate_invite_token
  begin
    -- try as text
    select (generate_invite_token())::text into v_invite_token;
  exception when others then
    begin
      -- try as record with invite_token field
      select (generate_invite_token()).invite_token::text into v_invite_token;
    exception when others then
      v_invite_token := null;
    end;
  end;

  if v_invite_token is null then
    raise exception 'Failed to generate invite token';
  end if;

  v_meta := jsonb_build_object(
    'invite_token', v_invite_token,
    'invite_sent_at', to_char(v_invite_sent_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'invite_expires_at', to_char(v_invite_expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'invite_flow', _invite_flow,
    'invite_channel', _invite_channel,
    'invite_status', 'pending',
    'invite_from', _inviter_profile_id,
    'share_confirmed', false,
    'invite_attempts', 1,
    'contact_name', _contact_name,
    'normalized_phone', _phone,
    'normalized_email', _email
  );

  -- upsert friendships (use explicit column names to avoid ambiguity)
  insert into friendships (
    requester_id, friend_id, source, status, meta
  ) values (
    _inviter_profile_id, v_friend_id, coalesce(_inviter_source, (case when _phone is not null then 'phone' when _email is not null then 'email' end)), 'pending', v_meta
  )
  on conflict (requester_id, friend_id)
  do update set
    meta = excluded.meta,
    status = excluded.status,
    source = excluded.source
  ;

  -- upsert group_members
  insert into group_members (group_id, user_id, invited_by, role)
  values (_group_id, v_friend_id, _inviter_profile_id, 'member')
  on conflict (group_id, user_id) do update set
    invited_by = coalesce(group_members.invited_by, excluded.invited_by)
  ;

  return jsonb_build_object(
    'ok', true,
    'invite_token', v_invite_token,
    'friend_profile_id', v_friend_id,
    'invite_sent_at', to_char(v_invite_sent_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'invite_expires_at', to_char(v_invite_expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'invite_link', _app_invite_base_url || '?token=' || v_invite_token || '&friend_id=' || v_friend_id
  );
end;
$$;

