// functions/signup/index.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
const jsonHeaders = {
  'Content-Type': 'application/json',
};
function extractUid(createUserResponse) {
  if (!createUserResponse) return null;
  if (typeof createUserResponse.id === 'string') return createUserResponse.id;
  if (createUserResponse.user && typeof createUserResponse.user.id === 'string')
    return createUserResponse.user.id;
  if (
    createUserResponse.data &&
    createUserResponse.data.user &&
    typeof createUserResponse.data.user.id === 'string'
  )
    return createUserResponse.data.user.id;
  if (createUserResponse.data && typeof createUserResponse.data.id === 'string')
    return createUserResponse.data.id;
  return null;
}
function normalizeInput(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function safeLog(...args) {
  console.log(...args);
}
serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'method_not_allowed',
          message: 'Use POST',
        }),
        {
          status: 405,
          headers: jsonHeaders,
        }
      );
    }
    const body = await req.json().catch(() => ({}));
    const {
      email: rawEmail,
      phone: rawPhone,
      password,
      full_name,
      invited_by = null,
      metadata = null,
      theme = 'system',
      language = 'en',
      currency = 'INR',
    } = body;
    const email = normalizeInput(rawEmail);
    const phone = normalizeInput(rawPhone);
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'validation_error',
          message: 'email and password are required',
        }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      );
    }
    // 1) Pre-check in auth.users via RPC
    const { data: existing, error: rpcErr } = await supabaseAdmin.rpc(
      'get_auth_user_by_email_or_phone',
      {
        p_email: email,
        p_phone: phone,
      }
    );
    if (rpcErr) {
      console.error('RPC check error', rpcErr);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'rpc_error',
          message: 'Internal error checking existing users',
          data: {
            details: rpcErr?.message ?? String(rpcErr),
          },
        }),
        {
          status: 500,
          headers: jsonHeaders,
        }
      );
    }
    // Unified conflict detection from RPC result
    if (existing && Array.isArray(existing) && existing.length > 0) {
      const conflicts = new Set();
      for (const row of existing) {
        // adjust properties if your RPC returns different keys
        if (email && row.email && String(row.email).toLowerCase() === String(email).toLowerCase())
          conflicts.add('email');
        if (phone && row.phone && String(row.phone) === String(phone)) conflicts.add('phone');
      }
      if (conflicts.size > 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'conflict',
            message: `The following fields are already in use: ${Array.from(conflicts).join(', ')}`,
          }),
          {
            status: 409,
            headers: jsonHeaders,
          }
        );
      }
    }
    // 2) Create auth user via admin API
    const createPayload = {
      password,
      user_metadata: {
        full_name,
        invited_by,
        ...(metadata || {}),
      },
      email_confirm: true,
    };
    createPayload.email = email;
    if (phone) createPayload.phone = phone;
    const { data: newUserRaw, error: createErr } =
      await supabaseAdmin.auth.admin.createUser(createPayload);
    if (createErr) {
      // Log non-sensitive info
      console.error('admin.createUser failed (non-sensitive):', createErr?.message ?? createErr);
      // Try to detect a phone/email conflict from the provider error text
      const rawErrMsg = String(createErr?.message ?? createErr).toLowerCase();
      const conflicts = new Set();
      // Look for obvious cues in the error message or code
      if (rawErrMsg.includes('phone')) conflicts.add('phone');
      if (rawErrMsg.includes('email')) conflicts.add('email');
      // Also look for common phrases
      if (
        rawErrMsg.includes('already registered') ||
        rawErrMsg.includes('already exists') ||
        rawErrMsg.includes('already in use')
      ) {
        if (rawErrMsg.includes('phone')) conflicts.add('phone');
        if (rawErrMsg.includes('email')) conflicts.add('email');
        // If message doesn't explicitly mention which field but includes "already exists", try to include both if both were provided
        if (!rawErrMsg.includes('phone') && !rawErrMsg.includes('email')) {
          if (email) conflicts.add('email');
          if (phone) conflicts.add('phone');
        }
      }
      // If we detected a conflict, respond with a unified 409 and comma-separated field names
      if (conflicts.size > 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'conflict',
            message: `The following fields are already in use: ${Array.from(conflicts).join(', ')}`,
          }),
          {
            status: 409,
            headers: jsonHeaders,
          }
        );
      }
      // Fallback: unknown create error
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'create_user_failed',
          message: 'Failed to create auth user',
          data: {
            details: createErr?.message ?? String(createErr),
          },
        }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      );
    }
    safeLog('admin.createUser succeeded');
    const uid = extractUid(newUserRaw);
    if (!uid) {
      try {
        console.error('admin.createUser returned no id. Response:', JSON.stringify(newUserRaw));
      } catch (e) {
        console.error('Logging createUser response failed', e);
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'no_user_id',
          message: 'Auth user created but no id returned',
          data: {
            fullResponse: newUserRaw,
          },
        }),
        {
          status: 500,
          headers: jsonHeaders,
        }
      );
    }
    // 3) Insert profile via RPC
    const { data: profileRes, error: profileErr } = await supabaseAdmin.rpc(
      'create_profile_for_auth_user',
      {
        p_uid: uid,
        p_email: email,
        p_phone: phone,
        p_nickname: full_name ?? null,
        p_metadata: metadata ? metadata : null,
        p_theme: theme,
        p_language: language,
        p_currency: currency,
        p_invited_by: invited_by ?? null,
      }
    );
    if (profileErr) {
      console.error('Profile RPC failed:', profileErr?.message ?? profileErr);
      try {
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (delErr) {
          console.error(
            'Failed to delete auth user after profile rpc failure:',
            delErr?.message ?? delErr
          );
        } else {
          safeLog('Rolled back auth user after profile insert failure (id masked):', uid);
        }
      } catch (e) {
        console.error('Exception while rolling back auth user:', e);
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'profile_insert_failed',
          message: 'Failed to create profile; signup rolled back',
          data: {
            profileErr: profileErr?.message ?? String(profileErr),
          },
        }),
        {
          status: 500,
          headers: jsonHeaders,
        }
      );
    }
    // 4) If admin.createUser doesn't auto-confirm, set the confirmation timestamp:
    await supabaseAdmin.auth.admin
      .updateUserById(uid, {
        email_confirmed_at: new Date().toISOString(),
      })
      .catch(() => {
        /* optional fallback */
      });
    // Success
    return new Response(
      JSON.stringify({
        ok: true,
        message: 'User created',
        data: {
          user_id: uid,
        },
      }),
      {
        status: 201,
        headers: jsonHeaders,
      }
    );
  } catch (err) {
    console.error('Unexpected server error (non-sensitive):', err?.message ?? String(err));
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'internal_server_error',
        message: 'Internal server error',
        data: {
          details: err?.message ?? String(err),
        },
      }),
      {
        status: 500,
        headers: jsonHeaders,
      }
    );
  }
});
