// functions/invites/index.ts
/**
 * POST /functions/v1/invites/:id/resend
 *
 * Deploy this file under functions/invites (so endpoint is /functions/v1/invites/:id/resend)
 *
 * Env required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - APP_INVITE_BASE_URL (optional, default "evenup://invite")
 * - INVITE_EXPIRY_DAYS (optional, default 7)
 */ import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_INVITE_BASE_URL = Deno.env.get('APP_INVITE_BASE_URL') ?? 'evenup://invite';
const INVITE_EXPIRY_DAYS = Number(Deno.env.get('INVITE_EXPIRY_DAYS') ?? '7');
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var');
}
const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});
serve(async (req) => {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // Expected parts example: ["functions","v1","invites","<id>","resend"]
    // Find index of "invites" then next is id, next is action
    const invitesIdx = parts.findIndex((p) => p === 'invites');
    if (invitesIdx === -1) {
      return new Response(
        JSON.stringify({
          error: 'Not found',
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    const friendshipId = parts[invitesIdx + 1];
    const action = parts[invitesIdx + 2];
    if (!friendshipId) {
      return new Response(
        JSON.stringify({
          error: 'Missing invite id in path',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Only support POST for now
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method Not Allowed',
        }),
        {
          status: 405,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Only implement `resend` action in this function
    if (action !== 'resend') {
      return new Response(
        JSON.stringify({
          error: 'Action not supported',
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Authenticate the inviter using their access token
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: missing token',
        }),
        {
          status: 401,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    const userClient = createClient(SUPABASE_URL, token, {
      auth: {
        persistSession: false,
      },
    });
    const userResult = await userClient.auth.getUser();
    if (userResult.error || !userResult.data?.user) {
      console.error('auth.getUser failed', userResult.error);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: invalid token',
        }),
        {
          status: 401,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    const authUserId = userResult.data.user.id;
    // Ensure inviter has a profile (assume user_profiles.id == auth user id)
    const { data: inviterProfile, error: inviterProfileErr } = await serviceClient
      .from('user_profiles')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();
    if (inviterProfileErr) {
      console.error('Failed fetching inviter profile', inviterProfileErr);
      return new Response(
        JSON.stringify({
          error: 'Server error fetching inviter profile',
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    if (!inviterProfile) {
      return new Response(
        JSON.stringify({
          error: 'Inviter profile not found',
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Fetch friendship row by id
    const { data: friendshipRow, error: fetchErr } = await serviceClient
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .maybeSingle();
    if (fetchErr) {
      console.error('Failed to fetch friendship', fetchErr);
      return new Response(
        JSON.stringify({
          error: 'Server error fetching friendship',
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    if (!friendshipRow) {
      return new Response(
        JSON.stringify({
          error: 'Friendship not found',
        }),
        {
          status: 404,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Ensure requester matches authenticated user
    if (String(friendshipRow.requester_id) !== String(authUserId)) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: not the inviter for this invite',
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Generate a fresh token via RPC
    const rpcRes = await serviceClient.rpc('generate_invite_token');
    if (rpcRes.error) {
      console.error('RPC generate_invite_token failed', rpcRes.error);
      return new Response(
        JSON.stringify({
          error: 'Server error generating token',
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    const newToken = rpcRes.data;
    if (!newToken) {
      console.error('RPC returned empty token');
      return new Response(
        JSON.stringify({
          error: 'Server error generating token',
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Build new meta JSON
    const oldMeta =
      friendshipRow.meta && typeof friendshipRow.meta === 'object' ? friendshipRow.meta : {};
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 3600 * 1000).toISOString();
    const prevTokens = Array.isArray(oldMeta.invite_previous_tokens)
      ? [...oldMeta.invite_previous_tokens]
      : [];
    if (oldMeta.invite_token) prevTokens.push(oldMeta.invite_token);
    const newInviteAttempts =
      typeof oldMeta.invite_attempts === 'number'
        ? oldMeta.invite_attempts + 1
        : oldMeta.invite_attempts
          ? Number(oldMeta.invite_attempts) + 1
          : 1;
    const newMeta = {
      ...oldMeta,
      invite_token: newToken,
      invite_sent_at: nowIso,
      invite_expires_at: expiresIso,
      invite_status: 'pending',
      invite_attempts: newInviteAttempts,
      invite_previous_tokens: prevTokens,
    };
    // Update friendship record
    const { data: updatedFriendship, error: updateErr } = await serviceClient
      .from('friendships')
      .update({
        meta: newMeta,
        status: 'pending',
        updated_at: nowIso,
      })
      .eq('id', friendshipId)
      .select('*')
      .maybeSingle();
    if (updateErr) {
      console.error('Failed to update friendship', updateErr);
      return new Response(
        JSON.stringify({
          error: 'Server error updating friendship',
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Build shareable invite link
    const friendProfileId = updatedFriendship.friend_id;
    const inviteLink = `${APP_INVITE_BASE_URL}${APP_INVITE_BASE_URL.includes('?') ? '&' : '?'}token=${encodeURIComponent(newToken)}&friend_id=${encodeURIComponent(friendProfileId)}`;
    return new Response(
      JSON.stringify({
        ok: true,
        inviteLink,
        friendship: updatedFriendship,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('Unexpected error in invites router', err);
    return new Response(
      JSON.stringify({
        error: String(err),
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  }
});
