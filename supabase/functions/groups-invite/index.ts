// functions/groups-invite/index.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const INVITE_EXPIRY_DAYS = Number(Deno.env.get('INVITE_EXPIRY_DAYS') || '7');
const APP_INVITE_BASE_URL = Deno.env.get('APP_INVITE_BASE_URL') || 'evenup://invite';
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY env vars');
  throw new Error('Missing Supabase environment variables');
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
});
function rpcJsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}
/** Convert ArrayBuffer -> hex */ function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
/** SHA-256 hex using Web Crypto (available in Deno) */ async function sha256Hex(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hash);
}
/** Use Supabase REST auth endpoint to validate access_token */ async function fetchAuthUserFromToken(
  token
) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      error: new Error(`Auth REST /user failed: ${res.status} ${text}`),
      data: null,
    };
  }
  const data = await res.json();
  return {
    error: null,
    data,
  };
}
serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      const res = {
        ok: false,
        error: 'Method Not Allowed',
      };
      return rpcJsonResponse(res, 405);
    }
    // Path extraction: expect /groups/:id/invite
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const groupsIndex = segments.indexOf('groups');
    const groupId =
      groupsIndex >= 0 && segments.length > groupsIndex + 1 ? segments[groupsIndex + 1] : null;
    if (!groupId) {
      const res = {
        ok: false,
        error: 'Missing group id in path',
      };
      return rpcJsonResponse(res, 400);
    }
    // Auth header + token (caller)
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      const res = {
        ok: false,
        error: 'Unauthorized - missing token',
      };
      return rpcJsonResponse(res, 401);
    }
    // Verify caller via REST endpoint
    const { error: authErr, data: authUser } = await fetchAuthUserFromToken(token);
    if (authErr || !authUser || !authUser.id) {
      console.error('auth.getUser (REST) error:', authErr);
      const res = {
        ok: false,
        error: 'Unauthorized',
      };
      return rpcJsonResponse(res, 401);
    }
    const inviterAuthUserId = authUser.id;
    // Map caller auth user -> user_profiles
    const { data: inviterProfileData, error: inviterProfileErr } = await sb
      .from('user_profiles')
      .select('id')
      .eq('id', inviterAuthUserId)
      .maybeSingle();
    if (inviterProfileErr) {
      console.error('user_profiles select error:', inviterProfileErr);
      const res = {
        ok: false,
        error: 'Server error reading inviter profile',
      };
      return rpcJsonResponse(res, 500);
    }
    if (!inviterProfileData) {
      const res = {
        ok: false,
        error: 'Inviter profile not found',
      };
      return rpcJsonResponse(res, 400);
    }
    const inviterProfileId = inviterProfileData.id;
    // parse body
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    // IMPORTANT: phone and email are expected to be already formatted/clean or null.
    const {
      phone: phoneFromClient = null,
      email: emailFromClient = null,
      contact_name,
      invite_channel = 'whatsapp',
    } = body;
    // Validate type
    // const type = String(requestedType ?? "existing");
    // if (![
    //   "new",
    //   "existing"
    // ].includes(type)) {
    //   const res = {
    //     ok: false,
    //     error: "Invalid type. Must be 'new' or 'existing'."
    //   };
    //   return rpcJsonResponse(res, 400);
    // }
    // Require at least one of phone/email (values used as-is)
    if (!phoneFromClient && !emailFromClient) {
      const res = {
        ok: false,
        error: 'Missing phone or email in request body',
      };
      return rpcJsonResponse(res, 400);
    }
    // Compute hashes from the raw provided values (no normalization)
    const phoneHash = phoneFromClient ? await sha256Hex(String(phoneFromClient)) : null;
    const emailHash = emailFromClient ? await sha256Hex(String(emailFromClient)) : null;
    // Search for existing profile by phone_hash or email_hash (only used when type !== 'new')
    let existingProfiles = [];
    if (phoneHash || emailHash) {
      const orParts = [];
      if (phoneHash) orParts.push(`phone_hash.eq.${phoneHash}`);
      if (emailHash) orParts.push(`email_hash.eq.${emailHash}`);
      try {
        const { data: profilesData, error: profilesErr } = await sb
          .from('user_profiles')
          .select('*')
          .or(orParts.join(','));
        if (profilesErr) {
          console.error('user_profiles search error:', profilesErr);
          const res = {
            ok: false,
            error: 'Server error searching profiles',
          };
          return rpcJsonResponse(res, 500);
        }
        existingProfiles = profilesData || [];
      } catch (e) {
        console.error('user_profiles search exception:', e);
        const res = {
          ok: false,
          error: 'Server error searching profiles',
        };
        return rpcJsonResponse(res, 500);
      }
    }
    // Decide creation flow
    let placeholderProfileId = null;
    let createdAuthUserId = null;
    if (existingProfiles.length === 0) {
      // Create placeholder auth user + user_profiles
      try {
        console.info('No existing profile found for provided phone/email. Creating New entry.');
        const placeholderId = crypto.randomUUID();
        const createPayload = {
          id: placeholderId,
          password: crypto.randomUUID(),
        };
        if (emailFromClient) {
          createPayload.email = emailFromClient;
          createPayload.email_confirm = true;
        }
        if (phoneFromClient) {
          createPayload.phone = phoneFromClient;
        }
        if (contact_name) {
          createPayload.user_metadata = {
            display_name: contact_name,
          };
        }
        if (!createPayload.email && !createPayload.phone) {
          const res = {
            ok: false,
            error: 'Cannot create auth user without email or phone.',
          };
          return rpcJsonResponse(res, 400);
        }
        const createRes = await sb.auth.admin.createUser(createPayload);
        if (createRes.error) {
          console.error('admin.createUser error:', createRes.error);
          const res = {
            ok: false,
            error: 'Server error creating placeholder auth user',
          };
          return rpcJsonResponse(res, 500);
        }
        createdAuthUserId = placeholderId;
        // Insert user_profiles row (store provided values as-is)
        const insertObj = {
          id: placeholderId,
          nickname: contact_name ?? null,
          email: emailFromClient ?? null,
          phone: phoneFromClient ?? null,
          avatar_url: null,
          invited_by: inviterProfileId,
          phone_hash: phoneHash ?? null,
          email_hash: emailHash ?? null,
          status: 'invited',
          metadata: {
            placeholder: true,
            contact_name: contact_name ?? null,
            canonical_phone: phoneFromClient ?? null,
          },
        };
        const insertRes = await sb.from('user_profiles').insert(insertObj).select().maybeSingle();
        if (insertRes.error) {
          console.error('user_profiles insert error (with auth user):', insertRes.error);
          // rollback: delete created auth user
          try {
            const delRes = await sb.auth.admin.deleteUser(createdAuthUserId);
            if (delRes.error) {
              console.error('rollback: failed to delete auth user', delRes.error);
            } else {
              console.info('rollback: deleted placeholder auth user', createdAuthUserId);
            }
          } catch (delErr) {
            console.error('rollback deleteUser exception:', delErr);
          }
          const res = {
            ok: false,
            error: 'Server error creating placeholder profile',
          };
          return rpcJsonResponse(res, 500);
        }
        placeholderProfileId = insertRes.data?.id ?? placeholderId;
        console.info('Created placeholder auth user & profile:', placeholderProfileId);
      } catch (err) {
        console.error('Error creating placeholder with auth:', err);
        if (createdAuthUserId) {
          try {
            await sb.auth.admin.deleteUser(createdAuthUserId);
          } catch (e) {
            console.error('rollback deleteUser exception:', e);
          }
        }
        const res = {
          ok: false,
          error: 'Server error creating placeholder',
        };
        return rpcJsonResponse(res, 500);
      }
    } else {
      // type === 'existing'
      //   if (existingProfiles.length === 0) {
      //     const res = {
      //       ok: false,
      //       error: "No existing profile found for provided phone/email. Use type='new' to create."
      //     };
      //     return rpcJsonResponse(res, 400);
      //   }
      // reuse the first matching profile
      placeholderProfileId = existingProfiles[0].id;
      console.info('Reusing existing profile id (type=existing):', placeholderProfileId);
    }
    if (!placeholderProfileId) {
      const res = {
        ok: false,
        error: 'Failed to determine or create placeholder profile',
      };
      return rpcJsonResponse(res, 500);
    }
    // Generate invite token via RPC
    const tokenRes = await sb.rpc('generate_invite_token').maybeSingle();
    if (tokenRes.error) {
      console.error('generate_invite_token error:', tokenRes.error);
      const res = {
        ok: false,
        error: 'Server error generating invite token',
      };
      return rpcJsonResponse(res, 500);
    }
    // tokenRes may be shape { data: 'token' } or just { data: {...} } depending on RPC.
    // Normalize to the token string if possible.
    let inviteToken = null;
    try {
      if (tokenRes?.data && typeof tokenRes.data === 'string') {
        inviteToken = tokenRes.data;
      } else if (
        'data' in tokenRes &&
        tokenRes.data &&
        typeof tokenRes.data === 'object' &&
        'invite_token' in tokenRes.data
      ) {
        inviteToken = tokenRes.data.invite_token;
      } else if (typeof tokenRes === 'string') {
        inviteToken = tokenRes;
      } else if (tokenRes && tokenRes.invite_token) {
        inviteToken = tokenRes.invite_token;
      } else if (
        tokenRes &&
        tokenRes.data &&
        typeof tokenRes.data === 'object' &&
        tokenRes.data.invite_token
      ) {
        inviteToken = tokenRes.data.invite_token;
      } else if (tokenRes && tokenRes.data) {
        // try to stringify fallback
        inviteToken = String(tokenRes.data);
      } else {
        inviteToken = null;
      }
    } catch (e) {
      console.error('Error normalizing generate_invite_token response:', e);
      inviteToken = null;
    }
    if (!inviteToken) {
      console.error('generate_invite_token returned empty:', tokenRes);
      const res = {
        ok: false,
        error: 'Server error generating invite token',
      };
      return rpcJsonResponse(res, 500);
    }
    const inviteSentAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 3600 * 1000).toISOString();
    const meta = {
      invite_token: inviteToken,
      invite_sent_at: inviteSentAt,
      invite_expires_at: expiresAt,
      invite_flow: 'share',
      invite_channel,
      invite_status: 'pending',
      invite_from: inviterProfileId,
      share_confirmed: false,
      invite_attempts: 1,
      contact_name: contact_name ?? null,
      normalized_phone: phoneFromClient ?? null,
      normalized_email: emailFromClient ?? null,
    };
    // Upsert friendship
    const upsertFriendRes = await sb
      .from('friendships')
      .upsert(
        {
          requester_id: inviterProfileId,
          friend_id: placeholderProfileId,
          source: phoneFromClient ? 'phone' : 'email',
          status: 'pending',
          meta,
        },
        {
          onConflict: 'requester_id,friend_id',
        }
      )
      .select()
      .maybeSingle();
    if (upsertFriendRes.error) {
      console.error('friendships upsert error:', upsertFriendRes.error);
      const res = {
        ok: false,
        error: 'Server error upserting friendship',
      };
      return rpcJsonResponse(res, 500);
    }
    // Add to group_members — upsert to ignore conflict
    const upsertGroupRes = await sb
      .from('group_members')
      .upsert(
        {
          group_id: groupId,
          user_id: placeholderProfileId,
          invited_by: inviterProfileId,
          role: 'member',
        },
        {
          onConflict: 'group_id,user_id',
        }
      )
      .select()
      .maybeSingle();
    if (upsertGroupRes.error) {
      console.error('group_members upsert error:', upsertGroupRes.error);
      const res = {
        ok: false,
        error: 'Server error adding to group',
      };
      return rpcJsonResponse(res, 500);
    }
    const inviteLink = `${APP_INVITE_BASE_URL}?token=${encodeURIComponent(inviteToken)}&friend_id=${encodeURIComponent(placeholderProfileId)}`;
    const successData = {
      inviteLink,
      friend_profile_id: placeholderProfileId,
      invite_token: inviteToken,
      invite_sent_at: inviteSentAt,
      invite_expires_at: expiresAt,
    };
    const res = {
      ok: true,
      data: successData,
      message: 'Invite created',
    };
    return rpcJsonResponse(res, 200);
  } catch (err) {
    console.error('Unhandled error:', err);
    const res = {
      ok: false,
      error: String(err),
    };
    return rpcJsonResponse(res, 500);
  }
});
