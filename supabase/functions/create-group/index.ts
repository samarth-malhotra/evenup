// functions/create-group/index.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY env vars');
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
});
serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      const res = {
        ok: false,
        error: 'Method Not Allowed',
      };
      return new Response(JSON.stringify(res), {
        status: 405,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    // Extract token
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      const res = {
        ok: false,
        error: 'Unauthorized',
      };
      return new Response(JSON.stringify(res), {
        status: 401,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    // Validate token
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('auth.getUser error:', userErr);
      const res = {
        ok: false,
        error: 'Unauthorized',
      };
      return new Response(JSON.stringify(res), {
        status: 401,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    const authUserId = userData.user.id;
    // Get inviter profile
    const { data: inviterProfile, error: inviterProfileErr } = await sb
      .from('user_profiles')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();
    if (inviterProfileErr) {
      console.error('user_profiles lookup error:', inviterProfileErr);
      const res = {
        ok: false,
        error: 'Could not find user profile',
      };
      return new Response(JSON.stringify(res), {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    if (!inviterProfile?.id) {
      const res = {
        ok: false,
        error: 'Inviter profile not found',
      };
      return new Response(JSON.stringify(res), {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    // Parse body
    const body = await req.json().catch(() => ({}));
    const { name, avatar_url = null } = body;
    if (!name || String(name).trim().length === 0) {
      const res = {
        ok: false,
        error: 'Group name is required',
      };
      return new Response(JSON.stringify(res), {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    // Insert group
    const payload = {
      name: String(name).trim(),
      avatar_url,
      created_by: inviterProfile.id,
    };
    const { data: groupData, error: groupErr } = await sb
      .from('groups')
      .insert([payload])
      .select()
      .single();
    if (groupErr) {
      console.error('groups insert error:', groupErr);
      const res = {
        ok: false,
        error: 'Could not create group',
        message: groupErr.message,
      };
      return new Response(JSON.stringify(res), {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
    // Insert group_members (non-fatal)
    const { error: gmErr } = await sb.from('group_members').insert({
      group_id: groupData.id,
      user_id: inviterProfile.id,
      role: 'owner',
      invited_by: inviterProfile.id,
    });
    if (gmErr) console.warn('group_members insert warning:', gmErr);
    // ✅ Success response
    const res = {
      ok: true,
      data: groupData,
      message: 'Group created successfully',
    };
    return new Response(JSON.stringify(res), {
      status: 201,
      headers: {
        'content-type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Unhandled error in create-group:', err);
    const res = {
      ok: false,
      error: String(err),
    };
    return new Response(JSON.stringify(res), {
      status: 500,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
});
