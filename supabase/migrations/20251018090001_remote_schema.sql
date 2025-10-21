


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."friendship_source_enum" AS ENUM (
    'phone',
    'email',
    'app',
    'whatsapp'
);


ALTER TYPE "public"."friendship_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."group_member_status_enum" AS ENUM (
    'active',
    'deleted',
    'left'
);


ALTER TYPE "public"."group_member_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."group_status" AS ENUM (
    'active',
    'inactive',
    'deleted'
);


ALTER TYPE "public"."group_status" OWNER TO "postgres";


CREATE TYPE "public"."role_enum" AS ENUM (
    'owner',
    'member'
);


ALTER TYPE "public"."role_enum" OWNER TO "postgres";


CREATE TYPE "public"."status_enum" AS ENUM (
    'active',
    'invited',
    'suspended',
    'deleted'
);


ALTER TYPE "public"."status_enum" OWNER TO "postgres";


CREATE TYPE "public"."theme_enum" AS ENUM (
    'system',
    'dark',
    'light'
);


ALTER TYPE "public"."theme_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_inviter_member record;
  v_friend record;
  v_group_member record;
begin
  -- 1) Verify inviter is a member of the group
  select id, role into v_inviter_member
  from public.group_members
  where group_id = p_group_id
    and user_id = p_inviter
  limit 1;

  if not found then
    -- fail fast; edge function should catch this and return 403
    raise exception 'inviter_not_member';
  end if;

  -- Optional: if you want to restrict to admin/owner only, add:
  -- if v_inviter_member.role not in ('admin','owner') then
  --   raise exception 'inviter_not_authorized';
  -- end if;

  -- 2) friendships: insert only if a row for (requester_id, friend_id) does not exist.
  select * into v_friend
  from public.friendships
  where requester_id = p_inviter
    and friend_id = p_friend
  limit 1;

  if not found then
    insert into public.friendships(
      requester_id,
      friend_id,
      source,
      status,
      meta,
      created_at
    ) values (
      p_inviter,
      p_friend,
      coalesce(p_invite_channel, 'whatsapp'),
      'pending',
      coalesce(p_meta, '{}'::jsonb),
      now()
    );
  end if;

  -- 3) group_members: if exists -> UPDATE status='active', invited_by=inviter, removed_by=NULL
  select * into v_group_member
  from public.group_members
  where group_id = p_group_id
    and user_id = p_friend
  limit 1;

  if found then
    update public.group_members
    set status = 'active',
        invited_by = p_inviter,
        removed_by = null,
        left_at = null
    where id = v_group_member.id;
  else
    insert into public.group_members(
      group_id,
      user_id,
      invited_by,
      role,
      status,
      joined_at
    ) values (
      p_group_id,
      p_friend,
      p_inviter,
      'member',
      'active',
      now()
    );
  end if;

  -- Optionally persist an invites log if you have an 'invites' table.
  -- Example (uncomment and adapt if you have this table):
  -- insert into public.invites (group_id, friend_id, inviter_id, invite_token, invite_sent_at, invite_expires_at, channel, meta, created_at)
  -- values (p_group_id, p_friend, p_inviter, p_invite_token, p_invite_sent_at, p_invite_expires_at, p_invite_channel, p_meta, now());

  return jsonb_build_object(
    'ok', true,
    'friend_profile_id', p_friend,
    'invite_token', p_invite_token,
    'message', 'rpc_add_invite_to_group: success'
  );
exception
  when others then
    -- Normalize the error message so edge function can interpret
    return jsonb_build_object(
      'ok', false,
      'error', sqlstate || ': ' || coalesce(nullif(sqlerrm, ''), 'unknown error')
    );
end;
$$;


ALTER FUNCTION "public"."add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group"("name" "text", "avatar_url" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  _uid uuid := auth.uid();
  _group_record public.groups%ROWTYPE;
BEGIN
  -- auth check
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  -- inviter profile must exist
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inviter profile not found');
  END IF;

  -- validate name
  IF name IS NULL OR length(trim(name)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Group name is required');
  END IF;

  -- Insert group (handle unique constraint and other DB errors gracefully)
  BEGIN
    INSERT INTO public.groups (name, avatar_url, created_by)
    VALUES (trim(name), avatar_url, _uid)
    RETURNING * INTO _group_record;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Group with this name already exists');
    WHEN others THEN
      RETURN jsonb_build_object('ok', false, 'error', sqlerrm);
  END;

  -- Attempt to insert owner member; non-fatal — log a notice if it fails
  BEGIN
    INSERT INTO public.group_members (group_id, user_id, role, invited_by)
    VALUES (_group_record.id, _uid, 'owner', _uid);
  EXCEPTION
    WHEN others THEN
      -- NOTE: NOTICE is visible in DB logs but not returned to client; keeps RPC response clean
      RAISE NOTICE 'create_group_rpc: group_members insert warning: %', sqlerrm;
      -- continue and return success for group creation
  END;

  -- Success
  RETURN jsonb_build_object(
    'ok', true,
    'data', row_to_json(_group_record),
    'message', 'Group created successfully'
  );

EXCEPTION
  WHEN others THEN
    -- generic fallback; avoid leaking internal details but return something useful
    RETURN jsonb_build_object('ok', false, 'error', sqlerrm);
END;
$$;


ALTER FUNCTION "public"."create_group"("name" "text", "avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_invite"("_inviter_profile_id" "uuid", "_group_id" "uuid", "_placeholder_profile_id" "uuid", "_phone" "text", "_email" "text", "_contact_name" "text", "_invite_channel" "text", "_invite_flow" "text" DEFAULT 'share'::"text", "_inviter_source" "text" DEFAULT NULL::"text", "_invite_expires_days" integer DEFAULT 7, "_app_invite_base_url" "text" DEFAULT 'evenup://invite'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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


ALTER FUNCTION "public"."create_group_invite"("_inviter_profile_id" "uuid", "_group_id" "uuid", "_placeholder_profile_id" "uuid", "_phone" "text", "_email" "text", "_contact_name" "text", "_invite_channel" "text", "_invite_flow" "text", "_inviter_source" "text", "_invite_expires_days" integer, "_app_invite_base_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_transaction_with_splits"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  p jsonb := payload; -- canonical payload we will use
  tx_id uuid;
  t_title text;
  t_amount numeric;
  t_currency text;
  t_paid_by uuid;
  t_group_id uuid;
  t_created_by uuid;
  t_receipt_url text;
  t_status text;
  t_metadata jsonb;
  splits jsonb;
  s jsonb;
  s_user uuid;
  s_amount numeric;
  s_share_type text;
  s_share_meta jsonb;
  sum_splits numeric := 0;
  created_at_ts timestamp with time zone;
  _inner_text text;
begin
  /*
    Normalise payload shapes:
      - payload is already object => use as-is
      - payload = { "payload": <object> } => use inner object
      - payload = { "payload": "<stringified json>" } => parse inner string into jsonb
  */
  if p ? 'payload' then
    -- try to extract inner as jsonb; if inner is a JSON string (stringified JSON),
    -- casting -> try (p->>'payload')::jsonb
    begin
      -- if inner is a json value (object/array), this will succeed
      p := (p->'payload')::jsonb;
    exception when others then
      -- fallback: if inner is a string containing JSON, parse that string
      _inner_text := p->>'payload';
      if _inner_text is not null and length(btrim(_inner_text)) > 0 then
        p := _inner_text::jsonb;
      else
        -- inner payload empty -> keep original p (will fail validation later)
        p := '{}'::jsonb;
      end if;
    end;
  end if;

  -- extract fields from canonical payload 'p'
  t_title := nullif(btrim(p ->> 'title'), ''); -- treat empty string as null
  -- amount might be a number or a string, coerce safely
  begin
    t_amount := (p ->> 'amount')::numeric;
  exception when others then
    t_amount := null;
  end;
  t_currency := coalesce(p ->> 'currency', 'INR');
  begin
    t_paid_by := (p ->> 'paidBy')::uuid;
  exception when others then
    t_paid_by := null;
  end;
  begin
    t_group_id := (p ->> 'groupId')::uuid;
  exception when others then
    t_group_id := null;
  end;
  begin
    t_created_by := (p ->> 'createdBy')::uuid;
  exception when others then
    t_created_by := null;
  end;
  t_receipt_url := p ->> 'receiptUrl';
  t_status := coalesce(p ->> 'status', 'active');
  t_metadata := coalesce(p -> 'metadata', '{}'::jsonb);
  splits := p -> 'splits';

  -- Basic validation
  if t_title is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'title is required');
  end if;

  if t_amount is null or t_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'amount must be > 0');
  end if;

  if t_paid_by is null then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'paidBy is required');
  end if;

  if splits is null or jsonb_typeof(splits) is distinct from 'array' or jsonb_array_length(splits) = 0 then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'splits are required');
  end if;

  -- validate split objects and sum
  for s in select * from jsonb_array_elements(splits)
  loop
    begin
      s_user := (s ->> 'userId')::uuid;
    exception when others then
      s_user := null;
    end;
    begin
      s_amount := (s ->> 'amount')::numeric;
    exception when others then
      s_amount := null;
    end;
    s_share_type := coalesce(s ->> 'shareType', 'exact');
    s_share_meta := coalesce(s -> 'shareMeta', '{}'::jsonb);

    if s_user is null then
      return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'each split must have userId');
    end if;
    if s_amount is null or s_amount < 0 then
      return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'each split must have non-negative amount');
    end if;
    sum_splits := sum_splits + s_amount;
  end loop;

  -- enforce that sum of splits equals amount (tweak tolerance if you need)
  if abs(sum_splits - t_amount) > 0.01 then
    return jsonb_build_object(
      'ok', false,
      'error', 'validation_error',
      'message', format('sum of splits (%.2f) does not equal transaction amount (%.2f)', sum_splits, t_amount)
    );
  end if;

  -- create transaction
  insert into public.transactions(
    title, amount, currency, paid_by, group_id, status, receipt_url, created_by, created_at, metadata
  )
  values (
    t_title, t_amount, t_currency, t_paid_by, t_group_id, t_status, t_receipt_url, t_created_by, now(), coalesce(t_metadata, '{}'::jsonb)
  )
  returning id, created_at into tx_id, created_at_ts;

  -- insert splits
  for s in select * from jsonb_array_elements(splits)
  loop
    s_user := (s ->> 'userId')::uuid;
    s_amount := (s ->> 'amount')::numeric;
    s_share_type := coalesce(s ->> 'shareType', 'exact');
    s_share_meta := coalesce(s -> 'shareMeta', '{}'::jsonb);

    insert into public.transaction_splits(transaction_id, user_id, amount, share_type, share_meta, created_at)
    values (tx_id, s_user, s_amount, s_share_type, s_share_meta, now());
  end loop;

  -- success -> return standardized wrapper with data
  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object('transactionId', tx_id, 'createdAt', to_char(created_at_ts, 'YYYY-MM-DD"T"HH24:MI:SSOF'))
  );
exception
  when others then
    -- Return standardized error response (do NOT re-raise)
    return jsonb_build_object(
      'ok', false,
      'error', 'server_error',
      'message', coalesce(sqlerrm, 'unknown error')
    );
end;
$$;


ALTER FUNCTION "public"."create_group_transaction_with_splits"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_for_auth_user"("p_uid" "uuid", "p_email" "text", "p_phone" "text", "p_nickname" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_theme" "public"."theme_enum" DEFAULT 'light'::"public"."theme_enum", "p_language" "text" DEFAULT 'en'::"text", "p_currency" "text" DEFAULT 'INR'::"text", "p_invited_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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


ALTER FUNCTION "public"."create_profile_for_auth_user"("p_uid" "uuid", "p_email" "text", "p_phone" "text", "p_nickname" "text", "p_metadata" "jsonb", "p_theme" "public"."theme_enum", "p_language" "text", "p_currency" "text", "p_invited_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transaction_comment"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  tx_id uuid := (payload ->> 'transaction_id')::uuid;
  created_by uuid := (payload ->> 'created_by')::uuid;
  body text := payload ->> 'body';
  new_id uuid;
  created_ts timestamptz;
begin
  if tx_id is null or created_by is null or body is null or trim(body) = '' then
    return jsonb_build_object('ok', false, 'error', 'validation_error', 'message', 'Missing required fields');
  end if;

  insert into public.transaction_comments (transaction_id, created_by, body, created_at)
  values (tx_id, created_by, body, now())
  returning id, created_at into new_id, created_ts;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', new_id,
      'transaction_id', tx_id,
      'created_by', created_by,
      'body', body,
      'created_at', to_char(created_ts, 'YYYY-MM-DD"T"HH24:MI:SSOF')
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;


ALTER FUNCTION "public"."create_transaction_comment"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_group"("p_group_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  rows_affected integer;
begin
  update public.groups
  set 
    deleted_by = p_user_id,
    deleted_at = now(),
    status = 'deleted'
  where id = p_group_id;

  get diagnostics rows_affected = row_count;

  if rows_affected = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Group not found',
      'message', format('No group found for id: %s', p_group_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Group deleted successfully',
    'data', jsonb_build_object('group_id', p_group_id)
  );

exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Failed to delete group'
    );
end;
$$;


ALTER FUNCTION "public"."delete_group"("p_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_group_member"("p_group_id" "uuid", "p_user_id" "uuid", "p_removed_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  updated_row public.group_members%ROWTYPE;
  -- declare variable using the same type as the table's status column
  new_status public.group_members.status%TYPE;
BEGIN
  -- Determine status based on who removed the user
  IF p_user_id = p_removed_by THEN
    new_status := 'left'::public.group_member_status_enum;
  ELSE
    new_status := 'deleted'::public.group_member_status_enum;
  END IF;

  UPDATE public.group_members
  SET
    status = new_status,
    removed_by = p_removed_by,
    left_at = now()
  WHERE
    group_id = p_group_id
    AND user_id = p_user_id
    AND left_at IS NULL
    AND (status IS NULL OR status NOT IN (
      'deleted'::public.group_member_status_enum,
      'left'::public.group_member_status_enum
    ))
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_matching_active_member',
      'message', 'No active group_member row found for the given group_id and user_id'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'data', to_jsonb(updated_row)
  );
END;
$$;


ALTER FUNCTION "public"."delete_group_member"("p_group_id" "uuid", "p_user_id" "uuid", "p_removed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  b bytea := gen_random_bytes(32);
begin
  return encode(b, 'base64');
end;
$$;


ALTER FUNCTION "public"."generate_invite_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_by_email_or_phone"("p_email" "text", "p_phone" "text") RETURNS TABLE("id" "uuid", "email" "text", "phone" "text", "raw_user" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select u.id, u.email, u.phone, to_jsonb(u.*) as raw_user
  from auth.users u
  where (p_email is not null and u.email = p_email)
     or (p_phone is not null and u.phone = p_phone)
  limit 1;
$$;


ALTER FUNCTION "public"."get_auth_user_by_email_or_phone"("p_email" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_friends"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  friends jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'friendship_id', f.id,
        'friend_id', CASE WHEN f.requester_id = p_user_id THEN f.friend_id ELSE f.requester_id END::text,
        'nickname', up.nickname,
        'email', up.email,
        'phone', up.phone,
        'status', up.status
      )
    ),
    '[]'::jsonb
  ) INTO friends
  FROM friendships f
  JOIN user_profiles up
    ON up.id = (CASE WHEN f.requester_id = p_user_id THEN f.friend_id ELSE f.requester_id END)::uuid
  WHERE p_user_id IN (f.requester_id, f.friend_id);

  RETURN jsonb_build_object(
    'ok', true,
    'data', friends
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'message', 'Failed to fetch friends'
  );
END;
$$;


ALTER FUNCTION "public"."get_friends"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_group_details"("p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  effective_user uuid;
  group_exists boolean;
  member_exists boolean;
  result jsonb;
BEGIN
  -- Determine caller user id (prefer auth.uid() in Supabase)
  BEGIN
    effective_user := auth.uid();
  EXCEPTION WHEN others THEN
    effective_user := NULL;
  END;

  IF effective_user IS NULL THEN
    BEGIN
      effective_user := (current_setting('request.jwt.claims.sub', true))::uuid;
    EXCEPTION WHEN others THEN
      effective_user := NULL;
    END;
  END IF;

  IF effective_user IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_user_identified',
      'message', 'No user identity available in JWT. Ensure the request includes a valid Supabase access token.'
    );
  END IF;

  -- 1) Check that the group exists and is active
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id
      AND g.status = 'active'
  ) INTO group_exists;

  IF NOT group_exists THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'group_not_found_or_inactive',
      'message', 'Group not found or not active.'
    );
  END IF;

  -- 2) Check active membership (only after confirming group exists)
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = effective_user
      AND gm.left_at IS NULL
      AND (gm.status IS NULL OR gm.status NOT IN ('deleted','left'))
  ) INTO member_exists;

  IF NOT member_exists THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_a_group_member',
      'message', 'You are not a member of this group.'
    );
  END IF;

  -- 3) Build and return the group object
  SELECT jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'avatar_url', g.avatar_url,
    'simplified', g.simplified,
    'members',
      COALESCE(
        (
          SELECT jsonb_agg(member_obj)
          FROM (
            SELECT
              jsonb_build_object(
                'id', up.id,
                'name', up.nickname,
                'phone', up.phone,
                'email', up.email,
                'avatar_url', up.avatar_url,
                'currency', up.currency,
                'language', up.language,
                'account_status', up.status,
                'status_in_group', gm.status,
                'role', gm.role,
                'joined_at', gm.joined_at
              ) AS member_obj
            FROM public.group_members gm
            JOIN public.user_profiles up ON up.id = gm.user_id
            WHERE gm.group_id = g.id
              AND gm.left_at IS NULL
            ORDER BY
              (gm.role = 'owner') DESC,
              gm.joined_at NULLS LAST
          ) sub
        ), '[]'::jsonb
      )
  ) INTO result
  FROM public.groups g
  WHERE g.id = p_group_id
    AND g.status = 'active';

  -- Should be found since we checked earlier, but keep the guard
  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'group_not_found_or_inactive',
      'message', 'Group not found or not active.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', result);
END;
$$;


ALTER FUNCTION "public"."get_group_details"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_group_transactions_paginated"("p_group_id" "uuid", "p_user_id" "uuid", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  tx_rows jsonb;
  total_spent numeric := 0;
  you_owe numeric := 0;
  friends_owe numeric := 0;
begin
  /*
    Select the page of transactions using an inner subquery to
    apply ORDER BY + LIMIT/OFFSET deterministically, then aggregate
    that subquery into jsonb.
  */
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'amount', t.amount,
    'paidBy', t.paid_by,
    'paidByName', coalesce(up.nickname, up.email, up.phone, 'Unknown'),
    'paidByAvatar', up.avatar_url,
    'createdAt', to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'hasAttachment', (t.receipt_url is not null)
  )), '[]'::jsonb)
  into tx_rows
  from (
    select *
    from public.transactions tt
    where tt.group_id = p_group_id and tt.status <> 'deleted'
    order by tt.created_at desc
    limit p_limit offset p_offset
  ) t
  left join public.user_profiles up on up.id = t.paid_by;

  -- Totals (unchanged)
  select coalesce(sum(amount), 0) into total_spent
  from public.transactions
  where group_id = p_group_id and status <> 'deleted';

  with splits as (
    select ts.user_id, ts.amount, t.paid_by
    from public.transaction_splits ts
    join public.transactions t on t.id = ts.transaction_id
    where t.group_id = p_group_id and t.status <> 'deleted'
  )
  select
    coalesce(sum(case when s.user_id = p_user_id and s.user_id <> s.paid_by then s.amount end), 0),
    coalesce(sum(case when s.paid_by = p_user_id and s.user_id <> s.paid_by then s.amount end), 0)
  into you_owe, friends_owe
  from splits s;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'transactions', tx_rows,
      'summary', jsonb_build_object(
        'totalSpent', total_spent,
        'youOwe', you_owe,
        'friendsOwe', friends_owe
      )
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;


ALTER FUNCTION "public"."get_group_transactions_paginated"("p_group_id" "uuid", "p_user_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_friendship"("user_a" "uuid", "user_b" "uuid", "in_source" "text" DEFAULT 'manual'::"text", "in_status" "text" DEFAULT 'accepted'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  f_id uuid;
begin
  if user_a is null or user_b is null then
    raise exception 'user ids required';
  end if;
  if user_a = user_b then
    raise exception 'cannot create friendship with self';
  end if;

  -- attempt to find existing non-deleted friendship
  select id into f_id
  from public.friendships
  where (
    (requester_id = user_a and friend_id = user_b)
    or (requester_id = user_b and friend_id = user_a)
  ) and coalesce(status,'pending') <> 'deleted'
  limit 1;

  if found then
    return f_id;
  end if;

  -- not found: insert (requester_id = user_a for audit)
  insert into public.friendships
    (requester_id, friend_id, source, status, created_at)
  values
    (user_a, user_b, in_source, in_status, now())
  returning id into f_id;

  return f_id;
end;
$$;


ALTER FUNCTION "public"."get_or_create_friendship"("user_a" "uuid", "user_b" "uuid", "in_source" "text", "in_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_details"("p_tx_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  tx record;
  parts jsonb;
  cmts jsonb;
begin
  select t.*, coalesce(up.nickname, up.email, up.phone, 'Unknown') as payer_name, up.avatar_url as payer_avatar
  into tx
  from public.transactions t
  left join public.user_profiles up on up.id = t.paid_by
  where t.id = p_tx_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Transaction not found');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', ts.user_id,
    'amount', ts.amount,
    'shareType', ts.share_type,
    'name', coalesce(up.nickname, up.email, up.phone, 'Unknown'),
    'avatar_url', up.avatar_url
  ) order by ts.created_at), '[]'::jsonb) into parts
  from public.transaction_splits ts
  left join public.user_profiles up on up.id = ts.user_id
  where ts.transaction_id = p_tx_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'userId', c.created_by,
    'user', coalesce(u.nickname, u.email, u.phone, 'Unknown'),
    'message', c.body,
    'createdAt', to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
  ) order by c.created_at desc), '[]'::jsonb) into cmts
  from public.transaction_comments c
  left join public.user_profiles u on u.id = c.created_by
  where c.transaction_id = p_tx_id;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', tx.id,
      'title', tx.title,
      'amount', tx.amount,
      'currency', tx.currency,
      'paidBy', tx.paid_by,
      'paidByName', tx.payer_name,
      'paidByAvatar', tx.payer_avatar,
      'date', to_char(tx.created_at, 'YYYY-MM-DD'),
      'splitMethod', (tx.metadata ->> 'splitMethod')::text,
      'participants', parts,
      'comments', cmts
    )
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'server_error', 'message', sqlerrm);
end;
$$;


ALTER FUNCTION "public"."get_transaction_details"("p_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_groups"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  groups jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(group_json), '[]'::jsonb)
  INTO groups
  FROM (
    SELECT
      jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'avatar_url', g.avatar_url,
        'created_at', g.created_at,
        'created_by', g.created_by,
        'simplified', g.simplified,
        'updated_at', g.updated_at
      ) AS group_json
    FROM groups g
    WHERE EXISTS (
      SELECT 1
      FROM group_members gm2
      WHERE gm2.group_id = g.id
        AND gm2.user_id = p_user_id
        AND gm2.left_at IS NULL
    )
    AND g.status = 'active'
    ORDER BY g.updated_at DESC
  ) t;

  RETURN jsonb_build_object(
    'ok', true,
    'data', groups
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Failed to fetch user groups'
    );
END;
$$;


ALTER FUNCTION "public"."get_user_groups"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_json jsonb;
BEGIN
  SELECT to_jsonb(up) INTO user_json
  FROM public.user_profiles up
  WHERE up.id = p_user_id
  LIMIT 1;

  IF user_json IS NULL THEN
    -- not found: return an application-level error envelope
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'not_found',
      'message', format('No user found for id: %s', p_user_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', user_json
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'internal_error',
      'message', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."get_user_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile_by_id"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_json jsonb;
BEGIN
  SELECT to_jsonb(up) INTO user_json
  FROM public.user_profiles up
  WHERE up.id = p_user_id
  LIMIT 1;

  IF user_json IS NULL THEN
    -- not found: return an application-level error envelope
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'not_found',
      'message', format('No user found for id: %s', p_user_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', user_json
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'internal_error',
      'message', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."get_user_profile_by_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_text"("txt" "text") RETURNS "text"
    LANGUAGE "sql"
    AS $$
  select encode(digest(txt, 'sha256'), 'hex');
$$;


ALTER FUNCTION "public"."hash_text"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_invite_attempts"("f_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update friendships set meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{invite_attempts}',
    to_jsonb(coalesce((meta->>'invite_attempts')::int, 0) + 1), true)
  where id = f_id;
end;
$$;


ALTER FUNCTION "public"."increment_invite_attempts"("f_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_contact_hashes"("hashes" "text"[]) RETURNS TABLE("profile_id" "uuid", "phone_hash" "text", "email_hash" "text", "status" "text", "nickname" "text", "avatar_url" "text", "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
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


ALTER FUNCTION "public"."match_contact_hashes"("hashes" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_inviter_member record;
  v_friend record;
  v_group_member record;
begin
  -- 1) Verify inviter is a member of the group
  select id, role into v_inviter_member
  from public.group_members
  where group_id = p_group_id
    and user_id = p_inviter
  limit 1;

  if not found then
    -- fail fast; edge function should catch this and return 403
    raise exception 'inviter_not_member';
  end if;

  -- Optional: if you want to restrict to admin/owner only, add:
  -- if v_inviter_member.role not in ('admin','owner') then
  --   raise exception 'inviter_not_authorized';
  -- end if;

  -- 2) friendships: insert only if a row for (requester_id, friend_id) does not exist.
  select * into v_friend
  from public.friendships
  where requester_id = p_inviter
    and friend_id = p_friend
  limit 1;

  if not found then
    insert into public.friendships(
      requester_id,
      friend_id,
      source,
      status,
      meta,
      created_at
    ) values (
      p_inviter,
      p_friend,
      coalesce(p_invite_channel, 'app'),
      'pending',
      coalesce(p_meta, '{}'::jsonb),
      now()
    );
  end if;

  -- 3) group_members: if exists -> UPDATE status='active', invited_by=inviter, removed_by=NULL
  select * into v_group_member
  from public.group_members
  where group_id = p_group_id
    and user_id = p_friend
  limit 1;

  if found then
    update public.group_members
    set status = 'active',
        invited_by = p_inviter,
        removed_by = null
    where id = v_group_member.id;
  else
    insert into public.group_members(
      group_id,
      user_id,
      invited_by,
      role,
      status,
      joined_at
    ) values (
      p_group_id,
      p_friend,
      p_inviter,
      'member',
      'active',
      now()
    );
  end if;

  -- Optionally persist an invites log if you have an 'invites' table.
  -- Example (uncomment and adapt if you have this table):
  -- insert into public.invites (group_id, friend_id, inviter_id, invite_token, invite_sent_at, invite_expires_at, channel, meta, created_at)
  -- values (p_group_id, p_friend, p_inviter, p_invite_token, p_invite_sent_at, p_invite_expires_at, p_invite_channel, p_meta, now());

  return jsonb_build_object(
    'ok', true,
    'friend_profile_id', p_friend,
    'invite_token', p_invite_token,
    'message', 'rpc_add_invite_to_group: success'
  );
exception
  when others then
    -- Normalize the error message so edge function can interpret
    return jsonb_build_object(
      'ok', false,
      'error', sqlstate || ': ' || coalesce(nullif(sqlerrm, ''), 'unknown error')
    );
end;
$$;


ALTER FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_inviter_member record;
  v_friend record;
  v_group_member record;
begin
  -- 1) Verify inviter is a member of the group
  select id, role into v_inviter_member
  from public.group_members
  where group_id = p_group_id
    and user_id = p_inviter
  limit 1;

  if not found then
    -- fail fast; edge function should catch this and return 403
    raise exception 'inviter_not_member';
  end if;

  -- Optional: if you want to restrict to admin/owner only, add:
  -- if v_inviter_member.role not in ('admin','owner') then
  --   raise exception 'inviter_not_authorized';
  -- end if;

  -- 2) friendships: insert only if a row for (requester_id, friend_id) does not exist.
  select * into v_friend
  from public.friendships
  where requester_id = p_inviter
    and friend_id = p_friend
  limit 1;

  if not found then
    insert into public.friendships(
      requester_id,
      friend_id,
      source,
      status,
      meta,
      created_at
    ) values (
      p_inviter,
      p_friend,
      coalesce(p_invite_channel, 'app'),
      'pending',
      coalesce(p_meta, '{}'::jsonb),
      now()
    );
  end if;

  -- 3) group_members: if exists -> UPDATE status='active', invited_by=inviter, removed_by=NULL
  select * into v_group_member
  from public.group_members
  where group_id = p_group_id
    and user_id = p_friend
  limit 1;

  if found then
    update public.group_members
    set status = 'active',
        invited_by = p_inviter,
        removed_by = null
    where id = v_group_member.id;
  else
    insert into public.group_members(
      group_id,
      user_id,
      invited_by,
      role,
      status,
      joined_at
    ) values (
      p_group_id,
      p_friend,
      p_inviter,
      'member',
      'active',
      now()
    );
  end if;

  -- Optionally persist an invites log if you have an 'invites' table.
  -- Example (uncomment and adapt if you have this table):
  -- insert into public.invites (group_id, friend_id, inviter_id, invite_token, invite_sent_at, invite_expires_at, channel, meta, created_at)
  -- values (p_group_id, p_friend, p_inviter, p_invite_token, p_invite_sent_at, p_invite_expires_at, p_invite_channel, p_meta, now());

  return jsonb_build_object(
    'ok', true,
    'friend_profile_id', p_friend,
    'invite_token', p_invite_token,
    'message', 'rpc_add_invite_to_group: success'
  );
exception
  when others then
    -- Normalize the error message so edge function can interpret
    return jsonb_build_object(
      'ok', false,
      'error', sqlstate || ': ' || coalesce(nullif(sqlerrm, ''), 'unknown error')
    );
end;
$$;


ALTER FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_nickname" "text" DEFAULT NULL::"text", "p_theme" "public"."theme_enum" DEFAULT NULL::"public"."theme_enum") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_row public.user_profiles%ROWTYPE;
BEGIN
  -- If caller didn't provide any updatable fields, return current row (no-op)
  IF p_nickname IS NULL AND p_theme IS NULL THEN
    SELECT up.*
    INTO updated_row
    FROM public.user_profiles up
    WHERE up.id = p_user_id
    LIMIT 1;

    IF updated_row IS NULL THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'error', 'not_found',
        'message', format('No user found for id: %s', p_user_id)
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'data', to_jsonb(updated_row),
      'message', 'no_changes'  -- indicates nothing was changed
    );
  END IF;

  -- Perform update: only change fields that are explicitly provided (IS NOT NULL).
  UPDATE public.user_profiles up
  SET
    nickname   = CASE WHEN p_nickname IS NOT NULL THEN p_nickname ELSE up.nickname END,
    theme      = CASE WHEN p_theme    IS NOT NULL THEN p_theme    ELSE up.theme    END,
    updated_at = now()
  WHERE up.id = p_user_id
  RETURNING up.* -- return entire row
  INTO updated_row;

  IF updated_row IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'not_found',
      'message', format('No user found for id: %s', p_user_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'data', to_jsonb(updated_row)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'internal_error',
      'message', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_nickname" "text", "p_theme" "public"."theme_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_profile"("_id" "uuid", "_email" "text", "_phone" "text", "_avatar_url" "text", "_metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into user_profiles(id, email, phone, avatar_url, metadata, phone_hash, email_hash)
  values (_id, _email, _phone, _avatar_url, _metadata,
          case when _phone is not null then encode(digest(lower(_phone)::text, 'sha256'), 'hex') end,
          case when _email is not null then encode(digest(lower(_email)::text, 'sha256'), 'hex') end)
  on conflict (id) do update
  set email = coalesce(excluded.email, user_profiles.email),
      phone = coalesce(excluded.phone, user_profiles.phone),
      avatar_url = coalesce(excluded.avatar_url, user_profiles.avatar_url),
      metadata = user_profiles.metadata || excluded.metadata,
      phone_hash = coalesce(excluded.phone_hash, user_profiles.phone_hash),
      email_hash = coalesce(excluded.email_hash, user_profiles.email_hash),
      updated_at = now();
end;
$$;


ALTER FUNCTION "public"."upsert_user_profile"("_id" "uuid", "_email" "text", "_phone" "text", "_avatar_url" "text", "_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_profiles_before_insert_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  pepper text := null;
begin
  -- normalization examples
  if new.email is not null then
    new.email := lower(trim(new.email));
  end if;

  if new.phone is not null then
    new.phone := regexp_replace(trim(new.phone), '\s+', '', 'g'); -- simple strip spaces; prefer E.164 normalization in app
  end if;

  -- update timestamps
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  end if;

  -- OPTIONAL: compute server-side hash using pgcrypto digest (SHA256)
  -- WARNING: using server-side digest alone is vulnerable to precomputation; prefer HMAC with a server secret.
  -- Uncomment if you want server-side SHA256 (not HMAC):
  -- if new.phone is not null then
  --   new.phone_hash := encode(digest(new.phone, 'sha256'), 'hex');
  -- end if;
  -- if new.email is not null then
  --   new.email_hash := encode(digest(new.email, 'sha256'), 'hex');
  -- end if;

  return new;
end; $$;


ALTER FUNCTION "public"."user_profiles_before_insert_update"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "source" "public"."friendship_source_enum",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "removed_at" timestamp with time zone,
    "meta" "jsonb",
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."role_enum" DEFAULT 'member'::"public"."role_enum" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "invited_by" "uuid",
    "removed_by" "uuid",
    "status" "public"."group_member_status_enum" DEFAULT 'active'::"public"."group_member_status_enum" NOT NULL
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "avatar_url" "text",
    "created_by" "uuid",
    "simplified" boolean DEFAULT false,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "reverted_by" "uuid"
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payer_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "payment_amount" numeric(18,2) NOT NULL,
    "payment_currency" character(3) DEFAULT 'INR'::"bpchar" NOT NULL,
    "group_id" "uuid",
    "friendship_id" "uuid",
    "method" "text",
    "reference" "text",
    "note" "text",
    "exchange_rate" numeric,
    "created_by" "uuid",
    "settled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "meta" "jsonb",
    CONSTRAINT "settlements_payment_amount_check" CHECK (("payment_amount" > (0)::numeric)),
    CONSTRAINT "settlements_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'voided'::"text"])))
);


ALTER TABLE "public"."settlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "type" "text" DEFAULT 'comment'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transaction_comments_type_check" CHECK (("type" = ANY (ARRAY['comment'::"text", 'edit_note'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."transaction_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_splits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(18,2) NOT NULL,
    "share_type" "text" DEFAULT 'exact'::"text" NOT NULL,
    "share_meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transaction_splits_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "transaction_splits_share_type_check" CHECK (("share_type" = ANY (ARRAY['exact'::"text", 'equal'::"text", 'percent'::"text"])))
);


ALTER TABLE "public"."transaction_splits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "amount" numeric(18,2) NOT NULL,
    "currency" character(3) DEFAULT 'INR'::"bpchar" NOT NULL,
    "paid_by" "uuid" NOT NULL,
    "group_id" "uuid",
    "friendship_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "receipt_url" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modified_by" "uuid",
    "modified_at" timestamp with time zone,
    "metadata" "jsonb",
    CONSTRAINT "transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "transactions_check" CHECK ((((("group_id" IS NOT NULL))::integer + (("friendship_id" IS NOT NULL))::integer) = 1)),
    CONSTRAINT "transactions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'edited'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "phone" "text",
    "avatar_url" "text",
    "currency" "text" DEFAULT 'INR'::"text" NOT NULL,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "theme" "public"."theme_enum" DEFAULT 'system'::"public"."theme_enum" NOT NULL,
    "nickname" "text",
    "status" "public"."status_enum" DEFAULT 'active'::"public"."status_enum" NOT NULL,
    "invited_by" "uuid",
    "last_active_at" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "phone_hash" "text",
    "email_hash" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_friend_id_key" UNIQUE ("requester_id", "friend_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_comments"
    ADD CONSTRAINT "transaction_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_splits"
    ADD CONSTRAINT "transaction_splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_splits"
    ADD CONSTRAINT "transaction_splits_transaction_id_user_id_key" UNIQUE ("transaction_id", "user_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "friendships_unique_pair_idx" ON "public"."friendships" USING "btree" (LEAST(("requester_id")::"text", ("friend_id")::"text"), GREATEST(("requester_id")::"text", ("friend_id")::"text")) WHERE (COALESCE("status", 'pending'::"text") <> 'deleted'::"text");



CREATE INDEX "idx_comments_tx" ON "public"."transaction_comments" USING "btree" ("transaction_id");



CREATE INDEX "idx_friendships_friend" ON "public"."friendships" USING "btree" ("friend_id");



CREATE INDEX "idx_friendships_meta_token" ON "public"."friendships" USING "btree" ((("meta" ->> 'invite_token'::"text")));



CREATE INDEX "idx_friendships_requester" ON "public"."friendships" USING "btree" ("requester_id");



CREATE INDEX "idx_group_members_group" ON "public"."group_members" USING "btree" ("group_id");



CREATE INDEX "idx_group_members_user" ON "public"."group_members" USING "btree" ("user_id");



CREATE INDEX "idx_settlements_created_at" ON "public"."settlements" USING "btree" ("settled_at");



CREATE INDEX "idx_settlements_currency" ON "public"."settlements" USING "btree" ("payment_currency");



CREATE INDEX "idx_settlements_group" ON "public"."settlements" USING "btree" ("group_id");



CREATE INDEX "idx_settlements_payer" ON "public"."settlements" USING "btree" ("payer_id");



CREATE INDEX "idx_settlements_receiver" ON "public"."settlements" USING "btree" ("receiver_id");



CREATE INDEX "idx_splits_tx" ON "public"."transaction_splits" USING "btree" ("transaction_id");



CREATE INDEX "idx_splits_user" ON "public"."transaction_splits" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_created_at" ON "public"."transactions" USING "btree" ("created_at");



CREATE INDEX "idx_transactions_friendship" ON "public"."transactions" USING "btree" ("friendship_id");



CREATE INDEX "idx_transactions_group" ON "public"."transactions" USING "btree" ("group_id");



CREATE INDEX "idx_transactions_paid_by" ON "public"."transactions" USING "btree" ("paid_by");



CREATE INDEX "idx_user_profiles_currency" ON "public"."user_profiles" USING "btree" ("currency");



CREATE INDEX "idx_user_profiles_email_hash" ON "public"."user_profiles" USING "btree" ("email_hash");



CREATE UNIQUE INDEX "idx_user_profiles_email_unique" ON "public"."user_profiles" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_user_profiles_language" ON "public"."user_profiles" USING "btree" ("language");



CREATE INDEX "idx_user_profiles_metadata_gin" ON "public"."user_profiles" USING "gin" ("metadata");



CREATE INDEX "idx_user_profiles_nickname_lower" ON "public"."user_profiles" USING "btree" ("lower"("nickname"));



CREATE INDEX "idx_user_profiles_phone_hash" ON "public"."user_profiles" USING "btree" ("phone_hash");



CREATE UNIQUE INDEX "idx_user_profiles_phone_unique" ON "public"."user_profiles" USING "btree" ("phone") WHERE ("phone" IS NOT NULL);



CREATE UNIQUE INDEX "uq_user_profiles_email_lower" ON "public"."user_profiles" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "uq_user_profiles_phone_hash" ON "public"."user_profiles" USING "btree" ("phone_hash") WHERE ("phone_hash" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_user_profiles_biu" BEFORE INSERT OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."user_profiles_before_insert_update"();



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "fk_friendships_friend_id_user_profiles" FOREIGN KEY ("friend_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "fk_friendships_requester_id_user_profiles" FOREIGN KEY ("requester_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "fk_group_members_invited_by_user_profiles" FOREIGN KEY ("invited_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "fk_group_members_removed_by_user_profiles" FOREIGN KEY ("removed_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "fk_group_members_user_id_user_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "fk_groups_created_by_user_profiles" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "fk_groups_deleted_by_user_profiles" FOREIGN KEY ("deleted_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "fk_groups_reverted_by_user_profiles" FOREIGN KEY ("reverted_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_friendship_id_fkey" FOREIGN KEY ("friendship_id") REFERENCES "public"."friendships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."transaction_comments"
    ADD CONSTRAINT "transaction_comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_comments"
    ADD CONSTRAINT "transaction_comments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_splits"
    ADD CONSTRAINT "transaction_splits_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_splits"
    ADD CONSTRAINT "transaction_splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_friendship_id_fkey" FOREIGN KEY ("friendship_id") REFERENCES "public"."friendships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_group"("name" "text", "avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_group"("name" "text", "avatar_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group"("name" "text", "avatar_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_group_invite"("_inviter_profile_id" "uuid", "_group_id" "uuid", "_placeholder_profile_id" "uuid", "_phone" "text", "_email" "text", "_contact_name" "text", "_invite_channel" "text", "_invite_flow" "text", "_inviter_source" "text", "_invite_expires_days" integer, "_app_invite_base_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_group_invite"("_inviter_profile_id" "uuid", "_group_id" "uuid", "_placeholder_profile_id" "uuid", "_phone" "text", "_email" "text", "_contact_name" "text", "_invite_channel" "text", "_invite_flow" "text", "_inviter_source" "text", "_invite_expires_days" integer, "_app_invite_base_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group_invite"("_inviter_profile_id" "uuid", "_group_id" "uuid", "_placeholder_profile_id" "uuid", "_phone" "text", "_email" "text", "_contact_name" "text", "_invite_channel" "text", "_invite_flow" "text", "_inviter_source" "text", "_invite_expires_days" integer, "_app_invite_base_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_group_transaction_with_splits"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_group_transaction_with_splits"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group_transaction_with_splits"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_for_auth_user"("p_uid" "uuid", "p_email" "text", "p_phone" "text", "p_nickname" "text", "p_metadata" "jsonb", "p_theme" "public"."theme_enum", "p_language" "text", "p_currency" "text", "p_invited_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_auth_user"("p_uid" "uuid", "p_email" "text", "p_phone" "text", "p_nickname" "text", "p_metadata" "jsonb", "p_theme" "public"."theme_enum", "p_language" "text", "p_currency" "text", "p_invited_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_auth_user"("p_uid" "uuid", "p_email" "text", "p_phone" "text", "p_nickname" "text", "p_metadata" "jsonb", "p_theme" "public"."theme_enum", "p_language" "text", "p_currency" "text", "p_invited_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_transaction_comment"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_transaction_comment"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transaction_comment"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_group"("p_group_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_group"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_group"("p_group_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_group_member"("p_group_id" "uuid", "p_user_id" "uuid", "p_removed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_group_member"("p_group_id" "uuid", "p_user_id" "uuid", "p_removed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_group_member"("p_group_id" "uuid", "p_user_id" "uuid", "p_removed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_auth_user_by_email_or_phone"("p_email" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_auth_user_by_email_or_phone"("p_email" "text", "p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_details"("p_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_details"("p_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_details"("p_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_transactions_paginated"("p_group_id" "uuid", "p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_transactions_paginated"("p_group_id" "uuid", "p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_transactions_paginated"("p_group_id" "uuid", "p_user_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_friendship"("user_a" "uuid", "user_b" "uuid", "in_source" "text", "in_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_friendship"("user_a" "uuid", "user_b" "uuid", "in_source" "text", "in_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_friendship"("user_a" "uuid", "user_b" "uuid", "in_source" "text", "in_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_details"("p_tx_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_details"("p_tx_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_details"("p_tx_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_groups"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_groups"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_groups"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile_by_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile_by_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile_by_id"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_text"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_text"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_text"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_invite_attempts"("f_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_invite_attempts"("f_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_invite_attempts"("f_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_contact_hashes"("hashes" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."match_contact_hashes"("hashes" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_contact_hashes"("hashes" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_add_member_to_group"("p_group_id" "uuid", "p_inviter" "uuid", "p_friend" "uuid", "p_meta" "jsonb", "p_invite_token" "text", "p_invite_sent_at" timestamp with time zone, "p_invite_expires_at" timestamp with time zone, "p_invite_channel" "public"."friendship_source_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_nickname" "text", "p_theme" "public"."theme_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_nickname" "text", "p_theme" "public"."theme_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile"("p_user_id" "uuid", "p_nickname" "text", "p_theme" "public"."theme_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_profile"("_id" "uuid", "_email" "text", "_phone" "text", "_avatar_url" "text", "_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_profile"("_id" "uuid", "_email" "text", "_phone" "text", "_avatar_url" "text", "_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_profile"("_id" "uuid", "_email" "text", "_phone" "text", "_avatar_url" "text", "_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_profiles_before_insert_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_profiles_before_insert_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_profiles_before_insert_update"() TO "service_role";


















GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."settlements" TO "anon";
GRANT ALL ON TABLE "public"."settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."settlements" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_comments" TO "anon";
GRANT ALL ON TABLE "public"."transaction_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_comments" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_splits" TO "anon";
GRANT ALL ON TABLE "public"."transaction_splits" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_splits" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
