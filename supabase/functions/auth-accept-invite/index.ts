// functions/auth-accept-invite/index.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY);
serve(async (req) => {
  try {
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
    const body = await req.json().catch(() => ({}));
    const { token, friend_profile_id, new_auth_user_id, email, phone, nickname } = body;
    if (!token || !friend_profile_id || !new_auth_user_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing params',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // 1) find friendship rows for given friend_profile_id
    const { data: friendships, error: fetchErr } = await sb
      .from('friendships')
      .select('*')
      .eq('friend_id', friend_profile_id);
    if (fetchErr) {
      console.error('Error fetching friendships:', fetchErr);
      return new Response(
        JSON.stringify({
          error: String(fetchErr),
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    if (!Array.isArray(friendships) || friendships.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token or friendship not found',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Find the exact friendship by inspecting meta.invite_token (safe in JS)
    const friendship = friendships.find((f) => f?.meta?.invite_token === token);
    if (!friendship) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // check expiry
    const inviteExpires = friendship.meta?.invite_expires_at;
    if (!inviteExpires || new Date(inviteExpires) < new Date()) {
      // mark expired (keep meta present)
      const updatedMeta = {
        ...(friendship.meta || {}),
        invite_status: 'expired',
      };
      await sb
        .from('friendships')
        .update({
          status: 'expired',
          meta: updatedMeta,
        })
        .eq('id', friendship.id);
      return new Response(
        JSON.stringify({
          error: 'Token expired',
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // If the placeholder profile id equals the new auth user id, simply accept
    if (friend_profile_id === new_auth_user_id) {
      const newMeta = {
        ...(friendship.meta || {}),
        invite_status: 'accepted',
        invite_token: null,
        responded_at: new Date().toISOString(),
      };
      await sb
        .from('friendships')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
          meta: newMeta,
        })
        .eq('id', friendship.id);
      return new Response(
        JSON.stringify({
          ok: true,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Otherwise, we need to merge placeholder -> real profile id
    // 1) move group_members rows
    const gmRes = await sb
      .from('group_members')
      .update({
        user_id: new_auth_user_id,
      })
      .eq('user_id', friend_profile_id);
    if (gmRes.error) {
      console.error('group_members update error:', gmRes.error);
      // continue — we don't necessarily want to abort the whole flow for a single table update, but log
    }
    // 2) update friendships entries referencing the placeholder profile (friend_id)
    const frRes = await sb
      .from('friendships')
      .update({
        friend_id: new_auth_user_id,
      })
      .eq('friend_id', friend_profile_id);
    if (frRes.error) {
      console.error('friendships update error:', frRes.error);
    }
    // 3) update other tables referencing user id (transactions, activities, etc.)
    // NOTE: add table updates here as needed. Example placeholders:
    // await sb.from("transactions").update({ user_id: new_auth_user_id }).eq("user_id", friend_profile_id);
    // await sb.from("activities").update({ user_id: new_auth_user_id }).eq("user_id", friend_profile_id);
    // 4) mark placeholder user_profile as merged (read current metadata, merge new key)
    const { data: profileRows, error: profErr } = await sb
      .from('user_profiles')
      .select('id, metadata')
      .eq('id', friend_profile_id)
      .maybeSingle();
    if (profErr) {
      console.error('Error reading placeholder profile:', profErr);
    } else if (profileRows) {
      const existingMeta = profileRows.metadata ?? {};
      const mergedMeta = {
        ...existingMeta,
        merged_to: new_auth_user_id,
        merged_at: new Date().toISOString(),
      };
      const updProfile = await sb
        .from('user_profiles')
        .update({
          metadata: mergedMeta,
        })
        .eq('id', friend_profile_id);
      if (updProfile.error) {
        console.error('Error updating placeholder profile metadata:', updProfile.error);
      }
    }
    // 5) mark the specific friendship as accepted and clear token
    const updatedMeta = {
      ...(friendship.meta || {}),
      invite_status: 'accepted',
      invite_token: null,
      responded_at: new Date().toISOString(),
    };
    await sb
      .from('friendships')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        meta: updatedMeta,
      })
      .eq('id', friendship.id);
    // 6) optionally notify inviter (insert into notifications table) - left as TODO
    return new Response(
      JSON.stringify({
        ok: true,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('Unhandled error:', err);
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
