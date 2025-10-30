// File: supabase/functions/process_notifications/index.ts
// Purpose: Cron-based Edge Function that consumes pgmq queue and delivers Expo push notifications.
// Updated to use public.peek_notifications / public.delete_notifications RPC wrappers
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// ---------- Config / env ----------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EXPO_ACCESS_TOKEN =
  Deno.env.get('EXPO_ACCESS_TOKEN') ?? 'QEfcAFfiqhyhUyCqq0dGCRaWQpRLGt5srpuumitH';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const DEBUG = (Deno.env.get('PROCESS_NOTIFS_DEBUG') ?? 'false') === 'true';
// Tunables
const QUEUE_NAME = 'notifications_queue';
const MAX_BATCH = 100;
const EXPO_BATCH_SIZE = 100;
const EXPO_FETCH_TIMEOUT_MS = 8_000; // 8s per chunk (tune as needed)
// ---------- Basic env validation ----------
if (DEBUG) {
  console.log('process_notifications starting. ENV presence:', {
    SUPABASE_URL: !!SUPABASE_URL,
    SERVICE_KEY: !!SERVICE_KEY,
    EXPO_ACCESS_TOKEN: !!EXPO_ACCESS_TOKEN,
    CRON_SECRET: !!CRON_SECRET,
  });
}
// Fail fast: don't create client with empty values (we'll still export handler but respond 500)
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
/**
 * fetch with timeout wrapper
 */ async function fetchWithTimeout(resource, init, timeoutMs = EXPO_FETCH_TIMEOUT_MS) {
  // Use Promise.race between fetch and timeout
  return Promise.race([
    fetch(resource, init),
    timeoutPromise(timeoutMs, `fetch timeout after ${timeoutMs}ms for ${String(resource)}`),
  ]);
}
// ---------- DB / Queue Operations using public RPC wrappers ----------
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
async function fetchQueueBatch() {
  if (DEBUG) console.log('supabase generated:', supabase);
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('peek_notifications', {
      limit_count: MAX_BATCH,
    });
    if (error) {
      console.error('fetchQueueBatch rpc error:', error);
      return [];
    }
    if (DEBUG)
      console.log(
        'fetchQueueBatch fetched:',
        Array.isArray(data) ? data.length : 0,
        data && data.slice ? data.slice(0, 5) : data
      );
    return data || [];
  } catch (err) {
    console.error('fetchQueueBatch fatal:', err);
    return [];
  }
}
async function deleteQueueMessages(msgIds) {
  if (!supabase) return;
  if (!msgIds || !msgIds.length) return;
  try {
    const { error } = await supabase.rpc('delete_notifications', {
      msg_ids: msgIds,
    });
    if (error) {
      console.error('deleteQueueMessages rpc error:', error);
    } else if (DEBUG) {
      console.log('Deleted messages from queue via RPC:', msgIds.length);
    }
  } catch (err) {
    console.error('deleteQueueMessages fatal:', err);
  }
}
// ---------- App-specific helpers (tokens, templates) ----------
async function getActiveTokens(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('active', true);
    if (error) {
      console.error('getActiveTokens error for user', userId, error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('getActiveTokens fatal for user', userId, err);
    return [];
  }
}
async function getTemplate(subtype, locale, userId) {
  if (!supabase)
    return {
      title_template: subtype,
      body_template: subtype,
    };
  try {
    // 1. exact match
    const { data: tpl } = await supabase
      .from('notification_templates')
      .select('title_template, body_template')
      .eq('subtype', subtype)
      .eq('locale', locale)
      .limit(1)
      .maybeSingle();
    if (tpl) return tpl;
    // 2. user language fallback
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
    // 3. English fallback
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
/**
 * Render template using simple mustache {{key}} pattern
 */ function renderTemplate(template, data) {
  if (!template) return '';
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path) => {
    const value = path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), data);
    return value == null ? '' : String(value);
  });
}
// ---------- Expo sending ----------
async function sendToExpo(messages) {
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
    const res = await fetchWithTimeout(
      'https://exp.host/--/api/v2/push/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(messages),
      },
      EXPO_FETCH_TIMEOUT_MS
    );
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
// ---------- Main processing ----------
async function processBatch(batch) {
  if (!supabase) return 0;
  const processedIds = [];
  for (const msg of batch) {
    try {
      const payload = safeJsonParse(msg?.message) ?? {};
      const notificationId = payload?.notification_id ?? payload?.id;
      if (!notificationId) {
        console.warn('Invalid message payload, missing notification_id:', msg);
        processedIds.push(msg.msg_id);
        continue;
      }
      // Fetch notification record
      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .maybeSingle();
      if (notifErr) {
        console.error('Error fetching notification', notificationId, notifErr);
        processedIds.push(msg.msg_id);
        continue;
      }
      if (!notif) {
        console.warn('Notification record not found:', notificationId);
        processedIds.push(msg.msg_id);
        continue;
      }
      const userId = notif.user_id;
      const tokens = await getActiveTokens(userId);
      if (!tokens.length) {
        // update status: no device
        try {
          await supabase
            .from('notifications')
            .update({
              status: 'no_device',
              expo_response: {
                error: 'no_active_device',
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', notificationId);
        } catch (e) {
          console.error('Failed updating notification no_device:', e);
        }
        processedIds.push(msg.msg_id);
        continue;
      }
      // ---------------------------
      // NEW: Enrich data with profiles, member, and group + expense fields
      // ---------------------------
      const dataObj = safeJsonParse(notif.data) ?? {};
      // attempt to locate member id from notification row or payload
      const possibleMemberId =
        notif.member_id ||
        dataObj.memberId ||
        dataObj.member?.id ||
        dataObj.templateParams?.memberId ||
        null;
      // attempt to locate group id from notification row or payload
      const possibleGroupId =
        notif.group_id ||
        dataObj.group_id ||
        dataObj.group?.id ||
        dataObj.templateParams?.groupId ||
        null;
      // Build list of profile ids to fetch: actor, user (target/recipient), member (if present)
      const idsToFetch = [];
      if (notif.actor_id) idsToFetch.push(notif.actor_id);
      if (notif.user_id && !idsToFetch.includes(notif.user_id)) idsToFetch.push(notif.user_id);
      if (possibleMemberId && !idsToFetch.includes(possibleMemberId))
        idsToFetch.push(possibleMemberId);
      let actorProfile = null;
      let userProfile = null;
      let memberProfile = null;
      if (idsToFetch.length) {
        try {
          // single query to fetch all relevant profiles
          const { data: profiles, error: profErr } = await supabase
            .from('user_profiles')
            .select('id, nickname, avatar_url, phone, email')
            .in('id', idsToFetch);
          if (profErr) {
            console.error('Failed fetching user_profiles for enrichment:', profErr);
          } else if (Array.isArray(profiles)) {
            for (const p of profiles) {
              if (!p) continue;
              if (String(p.id) === String(notif.actor_id)) actorProfile = p;
              if (String(p.id) === String(notif.user_id)) userProfile = p;
              if (possibleMemberId && String(p.id) === String(possibleMemberId)) memberProfile = p;
            }
          }
        } catch (e) {
          console.error('Fatal fetching user_profiles:', e);
        }
      }
      // Fetch group name if group id present
      let groupObj = null;
      if (possibleGroupId) {
        try {
          const { data: groupData, error: groupErr } = await supabase
            .from('groups')
            .select('id, name')
            .eq('id', possibleGroupId)
            .maybeSingle();
          if (groupErr) {
            console.error('Failed fetching group for enrichment:', groupErr);
          } else if (groupData) {
            groupObj = groupData;
          }
        } catch (e) {
          console.error('Fatal fetching group:', e);
        }
      }
      // Extract expense-related fields (amount, description, currency) from known shapes
      const amount =
        dataObj.amount ??
        (dataObj.transaction && dataObj.transaction.amount) ??
        (dataObj.payload && dataObj.payload.amount) ??
        null;
      const currency =
        dataObj.currency ?? (dataObj.templateParams && dataObj.templateParams.currency) ?? null;
      const description =
        dataObj.description ??
        (dataObj.templateParams && dataObj.templateParams.description) ??
        (dataObj.payload && dataObj.payload.description) ??
        null;
      // Prepare enriched data object used for templating
      const enrichedData = {
        ...dataObj,
        actor: actorProfile || null,
        user: userProfile || null,
        member: memberProfile || null,
        group: groupObj || null,
        subtype: notif.subtype,
        // expense-specific friendly fields
        amount,
        currency,
        description,
      };
      // Render templates
      const tpl = await getTemplate(notif.subtype, notif.locale || 'en', notif.user_id);
      const title = renderTemplate(tpl.title_template || notif.subtype, enrichedData);
      const body = renderTemplate(tpl.body_template || notif.subtype, enrichedData);
      // Build expo messages
      const expoMessages = tokens.map((t) => ({
        to: t.token,
        title,
        body,
        data: {
          notification_id: notif.id,
          ...enrichedData,
        },
      }));
      // Send in chunks
      for (let i = 0; i < expoMessages.length; i += EXPO_BATCH_SIZE) {
        const chunk = expoMessages.slice(i, i + EXPO_BATCH_SIZE);
        const expoRes = await sendToExpo(chunk);
        if (!expoRes?.ok) {
          // mark failed, but continue processing other messages for resiliency
          try {
            const platforms = tokens
              .map((t) => t.platform)
              .filter(Boolean)
              .join(',');
            await supabase
              .from('notifications')
              .update({
                status: 'failed',
                platform: platforms || null,
                expo_response: expoRes?.body || {
                  error: 'ExpoSendFailed',
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', notificationId);
          } catch (e) {
            console.error('Failed updating notification to failed:', e);
          }
          continue;
        }
        // Success: update record with ticket info where available
        try {
          const ticket_id =
            Array.isArray(expoRes.body?.data) && expoRes.body.data[0]?.id
              ? expoRes.body.data[0].id
              : null;
          const platforms = tokens
            .map((t) => t.platform)
            .filter(Boolean)
            .join(',');
          await supabase
            .from('notifications')
            .update({
              title,
              body,
              status: 'pending',
              platform: platforms || null,
              expo_response: expoRes.body,
              ticket_id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', notificationId);
        } catch (e) {
          console.error('Failed updating notification on success:', e);
        }
      }
      processedIds.push(msg.msg_id);
    } catch (e) {
      console.error('Failed processing msg_id', msg?.msg_id, e);
      // remove message to avoid poison queue; optionally you can choose not to remove and implement retry/backoff
      processedIds.push(msg?.msg_id);
    }
  }
  // Cleanup processed messages
  try {
    await deleteQueueMessages(processedIds);
  } catch (e) {
    console.error('deleteQueueMessages failed:', e);
  }
  return processedIds.length;
}
// ---------- Handler (entrypoint) ----------
serve(async function handler(req) {
  // Quick method check
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
    });
  }
  // Check supabase client and critical envs
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
      console.log(
        'incomingSecret: ',
        incomingSecret === CRON_SECRET,
        incomingSecret ? 'provided' : 'missing'
      );
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
    // continue — but it's likely harmless to continue in debug scenarios
  }
  // Instrumentation logs to find hang points quickly (remove or reduce in prod)
  if (DEBUG) console.log('Handler: about to check queueHasMessages()');
  const hasQueue = await queueHasMessages();
  if (DEBUG) console.log('Handler: queueHasMessages returned:', hasQueue);
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
  if (DEBUG) console.log('Handler: about to fetchQueueBatch()');
  const batch = await fetchQueueBatch();
  if (DEBUG) console.log('Handler: fetchQueueBatch returned count:', batch.length);
  if (!batch.length) {
    return new Response(
      JSON.stringify({
        ok: true,
        processed: 0,
        reason: 'empty_batch',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  if (DEBUG) console.log('Handler: about to processBatch()');
  const count = await processBatch(batch);
  if (DEBUG) console.log('Handler: processed count:', count);
  return new Response(
    JSON.stringify({
      ok: true,
      processed: count,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
});
