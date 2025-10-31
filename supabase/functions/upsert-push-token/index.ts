// functions/upsert-push-token/index.ts
// Deno / Supabase Edge Function
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.28.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // KEEP SECRET
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // fail early in dev if env missing
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
/**
 * Payload expected:
 * {
 *   user_id: string,
 *   token?: string | null,
 *   platform?: string | null,
 *   device_name: string
 * }
 *
 * Behavior:
 * - Finds existing row by (user_id, device_name).
 * - If row exists:
 *    - If token/platform changed OR last_seen is stale (> threshold), UPDATE row.
 *    - Else: SKIP update and return existing row (no DB write).
 * - If row not found: INSERT new row.
 *
 * Requires DB constraint: UNIQUE(user_id, device_name)
 */ const SKIP_THRESHOLD_MINUTES = 60;
serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
        }),
        {
          status: 405,
        }
      );
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON',
        }),
        {
          status: 400,
        }
      );
    }
    const { user_id, token = null, platform = null, device_name, os_version } = body;
    if (!user_id || !device_name) {
      return new Response(
        JSON.stringify({
          error: 'missing user_id or device_name',
        }),
        {
          status: 400,
        }
      );
    }
    // 1) select existing row for user+device
    const { data: existingRows, error: selectErr } = await sb
      .from('push_tokens')
      .select('*')
      .match({
        user_id,
        device_name,
      })
      .limit(1);
    if (selectErr) {
      console.error('select error:', selectErr);
      return new Response(
        JSON.stringify({
          error: 'db_select_error',
          details: selectErr.message,
        }),
        {
          status: 500,
        }
      );
    }
    const existing = Array.isArray(existingRows) && existingRows[0];
    const nowIso = new Date().toISOString();
    if (existing) {
      // decide whether to update
      const lastSeen = existing.last_seen ? new Date(existing.last_seen) : null;
      const diffMinutes = lastSeen ? (Date.now() - lastSeen.getTime()) / 60000 : Infinity;
      const tokenChanged = token && token !== existing.token;
      const platformChanged = platform && platform !== existing.platform;
      const shouldUpdateLastSeen = diffMinutes >= SKIP_THRESHOLD_MINUTES;
      if (!tokenChanged && !platformChanged && !shouldUpdateLastSeen) {
        // Skip DB write — return the existing row
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            data: existing,
          }),
          {
            status: 200,
          }
        );
      }
      // Perform update
      const { data: updated, error: updateErr } = await sb
        .from('push_tokens')
        .update({
          token,
          platform,
          active: true,
          last_seen: nowIso,
        })
        .match({
          user_id,
          device_name,
        })
        .select()
        .single();
      if (updateErr) {
        // fallback: try upsert in case of race
        console.error('update error, falling back to upsert:', updateErr);
        const { data: upserted, error: upsertErr } = await sb
          .from('push_tokens')
          .upsert(
            {
              token,
              user_id,
              platform,
              device_name,
              os_version,
              active: true,
              last_seen: nowIso,
            },
            {
              onConflict: 'user_id,device_name',
            }
          )
          .select()
          .single();
        if (upsertErr) {
          console.error('fallback upsert error:', upsertErr);
          return new Response(
            JSON.stringify({
              error: 'db_update_failed',
              details: upsertErr.message,
            }),
            {
              status: 500,
            }
          );
        }
        return new Response(
          JSON.stringify({
            ok: true,
            data: upserted,
            fallback: 'upsert',
          }),
          {
            status: 200,
          }
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          data: updated,
        }),
        {
          status: 200,
        }
      );
    }
    // Not found -> insert
    const { data: inserted, error: insertErr } = await sb
      .from('push_tokens')
      .insert([
        {
          token,
          user_id,
          platform,
          device_name,
          os_version,
          active: true,
          last_seen: nowIso,
        },
      ])
      .select()
      .single();
    if (insertErr) {
      // fallback to upsert (race-safe)
      console.error('insert error, falling back to upsert:', insertErr);
      const { data: upserted, error: upsertErr } = await sb
        .from('push_tokens')
        .upsert(
          {
            token,
            user_id,
            platform,
            device_name,
            os_version,
            active: true,
            last_seen: nowIso,
          },
          {
            onConflict: 'user_id,device_name',
          }
        )
        .select()
        .single();
      if (upsertErr) {
        console.error('fallback upsert error:', upsertErr);
        return new Response(
          JSON.stringify({
            error: 'db_insert_failed',
            details: upsertErr.message,
          }),
          {
            status: 500,
          }
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          data: upserted,
          fallback: 'upsert',
        }),
        {
          status: 200,
        }
      );
    }
    return new Response(
      JSON.stringify({
        ok: true,
        data: inserted,
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error('Unhandled error in upsert-push-token:', err);
    return new Response(
      JSON.stringify({
        error: 'internal',
        details: String(err),
      }),
      {
        status: 500,
      }
    );
  }
});
