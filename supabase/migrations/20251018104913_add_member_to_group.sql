/* rpc_add_invite_to_group
   - p_group_id: UUID of the group
   - p_inviter: UUID of the inviter (user_profiles.id)
   - p_friend: UUID of the friend/placeholder profile (user_profiles.id)
   - p_meta: jsonb metadata to store in friendships.meta (can be NULL)
   - p_invite_token: invite token string (optional, returned for convenience)
   - p_invite_sent_at: timestamptz when invite was sent
   - p_invite_expires_at: timestamptz when invite expires
   - p_invite_channel: text source (e.g. 'phone' | 'email' | 'whatsapp')
*/
create or replace function public.add_member_to_group(
  p_group_id uuid,
  p_inviter uuid,
  p_friend uuid,
  p_meta jsonb,
  p_invite_token text,
  p_invite_sent_at timestamptz,
  p_invite_expires_at timestamptz,
  p_invite_channel friendship_source_enum
)
returns jsonb
language plpgsql
as $$
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

