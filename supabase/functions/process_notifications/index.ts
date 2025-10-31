// File: supabase/functions/process_notifications/index.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// ---------- Config / env ----------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const DEBUG = (Deno.env.get('PROCESS_NOTIFS_DEBUG') ?? 'false') === 'true';
// Tunables
const QUEUE_NAME = 'notifications_queue';
const MAX_BATCH = 100;
const EXPO_BATCH_SIZE = 100;
const EXPO_FETCH_TIMEOUT_MS = 8_000; // 8s per chunk
// ---------- Basic env validation ----------
if (DEBUG) {
  console.log('process_notifications starting. ENV presence:', {
    SUPABASE_URL: !!SUPABASE_URL,
    SERVICE_KEY: !!SERVICE_KEY,
    EXPO_ACCESS_TOKEN: !!EXPO_ACCESS_TOKEN,
    CRON_SECRET: !!CRON_SECRET,
  });
}
let supabase = null;
if (SUPABASE_URL && SERVICE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          'x-edge-fn': 'process_notifications',
        },
      },
    });
  } catch (e) {
    console.error('Failed to create Supabase client:', e);
    supabase = null;
  }
} else {
  console.error('Missing SUPABASE_URL or SERVICE_KEY; supabase client not created.');
  // throw here is okay — but keep handler returning 500 as well
  throw new Error('Missing required environment variables');
}
// ---------- Helpers ----------
function safeJsonParse(input) {
  if (input == null) return null;
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(String(input));
  } catch {
    return null;
  }
}
function timeoutPromise(ms, msg = 'timeout') {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
}
async function fetchWithTimeout(resource, init, timeoutMs = EXPO_FETCH_TIMEOUT_MS) {
  return Promise.race([
    fetch(resource, init),
    timeoutPromise(timeoutMs, `fetch timeout after ${timeoutMs}ms for ${String(resource)}`),
  ]);
}
/**
 * Render template using simple mustache {{key}} pattern
 */ function renderTemplate(template, data) {
  if (!template) return '';
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path) => {
    const value = path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), data);
    return value == null ? '' : String(value);
  });
}
/**
 * Send to Expo with timeout
 */ async function sendToExpo(messages) {
  if (!messages.length)
    return {
      ok: true,
      status: 200,
      body: {
        data: [],
      },
    };
  if (!EXPO_ACCESS_TOKEN) {
    console.warn('No EXPO_ACCESS_TOKEN set; skipping Expo send and returning simulated success.');
    return {
      ok: true,
      status: 200,
      body: {
        data: [],
      },
    };
  }
  try {
    const res = await fetchWithTimeout('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages),
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        raw: text,
      };
    }
    if (DEBUG)
      console.log(
        'sendToExpo response status:',
        res.status,
        'parsed keys:',
        parsed && typeof parsed === 'object'
          ? Object.keys(parsed).slice(0, 5)
          : String(parsed).slice(0, 200)
      );
    return {
      ok: res.ok,
      status: res.status,
      body: parsed,
    };
  } catch (err) {
    console.error('sendToExpo error:', err);
    return {
      ok: false,
      status: 0,
      body: {
        error: String(err?.message || err),
      },
    };
  }
}
// ---------- DB helpers ----------
async function queueHasMessages() {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('peek_notifications', {
      limit_count: 1,
    });
    if (error) {
      console.error('queueHasMessages - rpc error:', error);
      return false;
    }
    if (DEBUG)
      console.log(
        'queueHasMessages - peek result length:',
        Array.isArray(data) ? data.length : data ? 1 : 0
      );
    return Array.isArray(data) ? data.length > 0 : !!data;
  } catch (err) {
    console.error('queueHasMessages - fatal:', err);
    return false;
  }
}
async function deleteQueueMessages(msgIds) {
  if (!supabase) return;
  if (!msgIds || !msgIds.length) return;
  // Ensure numeric array (bigint[] expectation)
  const numeric = msgIds.map((m) => Number(m));
  try {
    const { error } = await supabase.rpc('delete_notifications', {
      msg_ids: numeric,
    });
    if (error) {
      console.error('deleteQueueMessages rpc error:', error);
    } else if (DEBUG) {
      console.log('Deleted messages from queue via RPC:', numeric.length);
    }
  } catch (err) {
    console.error('deleteQueueMessages fatal:', err);
  }
}
/**
 * Mark invalid tokens as inactive when Expo says DeviceNotRegistered
 * Accepts array of tokens (strings)
 */ async function deactivateTokens(tokens) {
  if (!supabase) return;
  if (!tokens || !tokens.length) return;
  try {
    // update push_tokens active = false where token in (...)
    const { error } = await supabase
      .from('push_tokens')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .in('token', tokens);
    if (error) console.error('deactivateTokens error:', error);
    else if (DEBUG) console.log('Deactivated tokens:', tokens.length);
  } catch (e) {
    console.error('deactivateTokens fatal:', e);
  }
}
// ---------- Template helper (uses your existing getTemplate) ----------
async function getTemplate(subtype, locale, userId) {
  // Keep your existing getTemplate implementation or call DB. Minimal fallback:
  if (!supabase)
    return {
      title_template: subtype,
      body_template: subtype,
    };
  try {
    const { data: tpl } = await supabase
      .from('notification_templates')
      .select('title_template, body_template')
      .eq('subtype', subtype)
      .eq('locale', locale)
      .limit(1)
      .maybeSingle();
    if (tpl) return tpl;
    if (userId) {
      const { data: userLang } = await supabase
        .from('user_profiles')
        .select('language')
        .eq('id', userId)
        .maybeSingle();
      if (userLang?.language && userLang.language !== locale) {
        const { data: tpl2 } = await supabase
          .from('notification_templates')
          .select('title_template, body_template')
          .eq('subtype', subtype)
          .eq('locale', userLang.language)
          .limit(1)
          .maybeSingle();
        if (tpl2) return tpl2;
      }
    }
    const { data: tplEn } = await supabase
      .from('notification_templates')
      .select('title_template, body_template')
      .eq('subtype', subtype)
      .eq('locale', 'en')
      .limit(1)
      .maybeSingle();
    return (
      tplEn || {
        title_template: subtype,
        body_template: subtype,
      }
    );
  } catch (err) {
    console.error('getTemplate fatal:', err);
    return {
      title_template: subtype,
      body_template: subtype,
    };
  }
}
// ---------- Main processing using enriched RPC ----------
// Paste this into your process_notifications Edge function (replace existing processBatch).
// Replace your existing processBatch with this implementation.
async function processBatch(limit = 100) {
  if (!supabase) return 0;
  const processedMsgIds = [];
  // Fetch enriched notifications via new RPC
  const { data: enrichedRows, error } = await supabase.rpc('peek_enriched_notifications', {
    limit_count: limit,
  });
  console.log('enrichedRows: ', enrichedRows);
  if (error) {
    console.error('peek_enriched_notifications RPC error:', error);
    return 0;
  }
  if (!enrichedRows || !enrichedRows.length) {
    if (DEBUG) console.log('No messages found in queue.');
    return 0;
  }
  const templateCache = new Map();
  async function getTemplateCached(subtype, locale, userId) {
    const key = `${subtype || ''}|${locale || 'en'}`;
    if (templateCache.has(key)) return templateCache.get(key);
    try {
      const tpl = await getTemplate(subtype, locale, userId);
      templateCache.set(key, tpl);
      return tpl;
    } catch (err) {
      console.error('getTemplateCached error:', err);
      const fallback = {
        title_template: subtype,
        body_template: subtype,
      };
      templateCache.set(key, fallback);
      return fallback;
    }
  }
  // Helper: mark tokens inactive in push_tokens table
  async function deactivateTokens(tokensToDeactivate = []) {
    if (!tokensToDeactivate || !tokensToDeactivate.length) return;
    try {
      // dedupe
      const uniq = Array.from(new Set(tokensToDeactivate));
      await supabase
        .from('push_tokens')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .in('token', uniq);
      if (DEBUG) console.log('Deactivated tokens:', uniq.length);
    } catch (e) {
      console.error('Failed to deactivate tokens:', e);
    }
  }
  // Iterate rows and process each notification
  for (const row of enrichedRows) {
    const notif = row.notification_row || {};
    const msgId = row.msg_id;
    const tokens = Array.isArray(row.tokens) ? row.tokens : [];
    const userId = row.user_id;
    const actorId = row.actor_id;
    const actorRow = safeJsonParse(row.actor_profile) || null;
    const userRow = safeJsonParse(row.user_profile) || null;
    const memberRow = safeJsonParse(row.member_profile) || null;
    const groupRow = safeJsonParse(row.group_obj) || null;
    const dataObj = safeJsonParse(row.data) ?? {};
    // Prepare actorForTemplate: clone actor row. If actor==user, show "You".
    let actorForTemplate = actorRow
      ? {
          ...actorRow,
        }
      : null;
    if (actorForTemplate && userRow && String(actorForTemplate.id) === String(userRow.id)) {
      actorForTemplate.nickname = 'You';
    }
    // Prepare memberForTemplate: if member equals recipient, nickname => "You"
    let memberForTemplate = memberRow
      ? {
          ...memberRow,
        }
      : null;
    if (memberForTemplate && userRow && String(memberForTemplate.id) === String(userRow.id)) {
      memberForTemplate.nickname = 'You';
    }
    console.log('[notif]: ', notif);
    const enrichedData = {
      ...dataObj,
      actor: actorForTemplate,
      user: userRow,
      member: memberForTemplate,
      group: groupRow,
      subtype: notif.subtype,
    };
    // Render template always
    const tpl = await getTemplateCached(notif.subtype, notif.locale || 'en', notif.user_id);
    const title = renderTemplate(tpl.title_template || notif.subtype, enrichedData);
    const body = renderTemplate(tpl.body_template || notif.subtype, enrichedData);
    // Base update (always write title/body)
    const baseUpdate = {
      title,
      body,
      updated_at: new Date().toISOString(),
    };
    // Default status and expoResponse
    let status = 'no_device';
    let expoResponse = {
      info: 'no tokens',
    };
    let ticket_id = null;
    // CASE: actor == user => skip sending pushes, but set status skipped_self
    if (actorId && userId && String(actorId) === String(userId)) {
      status = 'skipped_self';
      expoResponse = {
        info: 'actor_self_skipped',
      };
      if (DEBUG)
        console.log(`Skipping push sends for notification ${notif.id} because actor == user.`);
      // Update notification with skipped_self
      try {
        await supabase
          .from('notifications')
          .update({
            ...baseUpdate,
            status,
            expo_response: expoResponse,
            ticket_id,
          })
          .eq('id', notif.id);
      } catch (e) {
        console.error('Failed updating notification for skipped_self:', notif.id, e);
      }
      // mark queue message processed
      processedMsgIds.push(msgId);
      continue; // skip to next row (no push attempts)
    }
    // CASE: send push only if tokens exist
    if (tokens.length > 0) {
      // Build expo messages in the same order as tokens array
      const expoMessages = tokens.map((t) => ({
        to: t.token,
        title,
        body,
        data: {
          notification_id: notif.id,
          ...enrichedData,
        },
      }));
      // We'll collect tokens to deactivate across chunks
      const tokensToDeactivate = [];
      // Send messages in chunks
      for (let i = 0; i < expoMessages.length; i += EXPO_BATCH_SIZE) {
        const chunk = expoMessages.slice(i, i + EXPO_BATCH_SIZE);
        const expoRes = await sendToExpo(chunk);
        // Consolidate expoResponse (best-effort)
        if (expoRes?.body) {
          // simple merge: keep last body under expoResponse and keep combined data array if present
          if (!expoResponse || typeof expoResponse !== 'object') expoResponse = {};
          // merge data arrays (if present)
          if (Array.isArray(expoRes.body.data)) {
            expoResponse.data = (expoResponse.data || []).concat(expoRes.body.data || []);
          } else if (expoRes.body) {
            expoResponse.last = expoRes.body;
          }
        }
        if (!expoRes?.ok) {
          status = 'failed';
          // still inspect body for per-message errors (to detect not-registered)
        } else {
          status = 'pending';
        }
        // Check expoRes.body.data for per-message errors (aligned with chunk order)
        // Expo response items correspond to chunk order
        try {
          const respArray = expoRes?.body?.data;
          if (Array.isArray(respArray)) {
            for (let idx = 0; idx < respArray.length; idx++) {
              const item = respArray[idx];
              // item.status === 'error' / item.details / item.message may contain device not registered info
              if (item && item.status === 'error') {
                const errMsg = String(item.message || item.details || '');
                // common indicators for device not registered
                const lowered = errMsg.toLowerCase();
                if (
                  errMsg.includes('DeviceNotRegistered') ||
                  errMsg.includes('NotRegistered') ||
                  lowered.includes('not register') ||
                  lowered.includes('device_not_registered')
                ) {
                  // collect token from chunk[idx]
                  const badToken = chunk[idx]?.to;
                  if (badToken) tokensToDeactivate.push(badToken);
                  if (DEBUG)
                    console.log('Detected not-registered token for:', badToken, 'error:', errMsg);
                }
              }
            }
          }
        } catch (err) {
          console.error('Error parsing expo response items for not-registered tokens:', err);
        }
        // End chunk loop
      } // end chunk loop
      // After all chunks, if any tokens to deactivate -> update DB
      if (tokensToDeactivate.length) {
        await deactivateTokens(tokensToDeactivate);
      }
      // Determine ticket_id: pick first id if available
      try {
        if (
          Array.isArray(expoResponse?.data) &&
          expoResponse.data.length > 0 &&
          expoResponse.data[0]?.id
        ) {
          ticket_id = expoResponse.data[0].id;
        }
      } catch (e) {
        // ignore
      }
    } // end if tokens
    // Update notification row with final status & expo_response
    try {
      await supabase
        .from('notifications')
        .update({
          ...baseUpdate,
          status,
          expo_response: expoResponse,
          ticket_id,
        })
        .eq('id', notif.id);
    } catch (e) {
      console.error('Failed updating notification after send:', notif.id, e);
    }
    // mark queue message processed
    processedMsgIds.push(msgId);
  } // end for enrichedRows
  // Delete processed queue messages (via RPC)
  if (processedMsgIds.length) {
    try {
      await supabase.rpc('delete_notifications', {
        msg_ids: processedMsgIds,
      });
      if (DEBUG) console.log('Deleted processed messages:', processedMsgIds.length);
    } catch (e) {
      console.error('delete_notifications RPC failed:', e);
    }
  }
  return processedMsgIds.length;
}
// ---------- Handler (entrypoint) ----------
serve(async function handler(req) {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', {
      status: 405,
    });
  if (!supabase) {
    console.error('Supabase client not initialized. Missing SUPABASE_URL/SERVICE_KEY?');
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'server_misconfigured',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  // Cron secret enforcement (if set)
  try {
    const incomingSecret = req.headers.get('x-cron-secret');
    if (CRON_SECRET) {
      if (!incomingSecret || incomingSecret !== CRON_SECRET) {
        console.warn('Invalid or missing x-cron-secret header - rejecting request');
        return new Response(
          JSON.stringify({
            code: 401,
            message: 'Missing or invalid cron secret',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } else if (DEBUG) {
      console.warn(
        'CRON_SECRET not set for function. Consider setting it to protect this endpoint.'
      );
    }
  } catch (e) {
    console.error('Error checking cron secret header:', e);
  }
  if (DEBUG) console.log('Handler: checking queueHasMessages()');
  const hasQueue = await queueHasMessages();
  if (!hasQueue) {
    return new Response(
      JSON.stringify({
        ok: true,
        processed: 0,
        reason: 'queue_empty',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  if (DEBUG) console.log('Handler: processing batch');
  const processedCount = await processBatch(MAX_BATCH);
  if (DEBUG) console.log('Handler: processedCount', processedCount);
  return new Response(
    JSON.stringify({
      ok: true,
      processed: processedCount,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
});
