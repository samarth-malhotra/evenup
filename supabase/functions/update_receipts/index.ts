// update_receipts/index.ts
// Supabase Edge Function: poll Expo receipts and update notifications table
//
// Env required:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   EXPO_ACCESS_TOKEN
//
// Deploy with: supabase functions deploy update_receipts
// Schedule cron: supabase functions schedule update_receipts --every "10 minutes"
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
const CRON_SECRET = Deno.env.get('CRON_SECRET');
if (!SUPABASE_URL || !SERVICE_KEY || !EXPO_ACCESS_TOKEN || !CRON_SECRET) {
  console.error(
    'Missing required env vars: SUPABASE_URL | SUPABASE_SERVICE_ROLE_KEY | EXPO_ACCESS_TOKEN | CRON_SECRET'
  );
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'x-edge-fn': 'update_receipts',
    },
  },
});
const TICKET_BATCH_SIZE = 100; // Expo getReceipts accepts many ids, keep moderate batches
const PENDING_LOOKBACK_DAYS = 7; // only consider pending tickets created in last N days
async function fetchPendingTicketIds(limit = 2000) {
  // Select distinct ticket_ids from notifications where status='pending' and ticket_id not null
  // and recent (to avoid scanning too far back)
  const since = new Date(Date.now() - PENDING_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .select('ticket_id')
    .neq('ticket_id', null)
    .eq('status', 'pending')
    .gt('created_at', since)
    .limit(limit);
  if (error) {
    console.error('Error fetching pending ticket_ids:', error);
    throw error;
  }
  const ids = (data || []).map((r) => r.ticket_id).filter(Boolean);
  // de-duplicate
  return Array.from(new Set(ids));
}
async function fetchReceiptsFromExpo(ticketIds) {
  const url = 'https://exp.host/--/api/v2/push/getReceipts';
  const payload = {
    ids: ticketIds,
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  try {
    return {
      ok: resp.ok,
      status: resp.status,
      body: JSON.parse(text),
    };
  } catch (e) {
    return {
      ok: resp.ok,
      status: resp.status,
      body: {
        raw: text,
      },
    };
  }
}
function interpretReceipt(ticketId, receiptObj) {
  // Expo receipts follow shape: { status: 'ok' } or { status: 'error', message: '...' , details: { error: 'DeviceNotRegistered', ... } }
  if (!receiptObj)
    return {
      status: 'unknown',
      reason: 'missing_receipt',
    };
  const st = receiptObj.status;
  if (st === 'ok')
    return {
      status: 'delivered',
      reason: null,
      receipt: receiptObj,
    };
  if (st === 'error') {
    // check for DeviceNotRegistered or similar permanent error
    const details = receiptObj.details || {};
    // Expo older docs: details.error === 'DeviceNotRegistered'
    const errCode = details.error || details.code || null;
    if (
      errCode === 'DeviceNotRegistered' ||
      (typeof receiptObj.message === 'string' && receiptObj.message.includes('not registered'))
    ) {
      return {
        status: 'not_registered',
        reason: receiptObj.message || errCode,
        receipt: receiptObj,
      };
    }
    return {
      status: 'failed',
      reason: receiptObj.message || errCode || 'error',
      receipt: receiptObj,
    };
  }
  return {
    status: 'unknown',
    reason: JSON.stringify(receiptObj),
  };
}
async function updateNotificationRowsForTicket(ticketId, interpretation) {
  // Update notifications rows where ticket_id = ticketId
  // We save the receipt in expo_response (merge/overwrite) and set status accordingly
  const newValues = {
    expo_response: interpretation.receipt ?? interpretation,
    status: interpretation.status,
    updated_at: new Date().toISOString(),
  };
  try {
    const { error } = await supabase
      .from('notifications')
      .update(newValues)
      .eq('ticket_id', ticketId);
    if (error) {
      console.error('Failed to update notification rows for ticket:', ticketId, error);
      return {
        ok: false,
        error,
      };
    }
    return {
      ok: true,
    };
  } catch (e) {
    console.error('Exception updating notifications for ticket:', ticketId, e);
    return {
      ok: false,
      error: e,
    };
  }
}
async function deactivatePushTokensByNotificationTicket(ticketId) {
  // Find device_token(s) from notifications matching ticketId and deactivate in push_tokens
  try {
    const { data: rows, error } = await supabase
      .from('notifications')
      .select('device_token')
      .eq('ticket_id', ticketId)
      .limit(100);
    if (error) {
      console.error('Failed reading notifications device_token for ticket:', ticketId, error);
      return {
        ok: false,
        error,
      };
    }
    const tokens = (rows || []).map((r) => r.device_token).filter(Boolean);
    if (!tokens.length)
      return {
        ok: true,
        changed: 0,
      };
    const { error: upErr } = await supabase
      .from('push_tokens')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .in('token', tokens);
    if (upErr) {
      console.error('Failed to deactivate push_tokens for tokens:', tokens, upErr);
      return {
        ok: false,
        error: upErr,
      };
    }
    return {
      ok: true,
      changed: tokens.length,
    };
  } catch (e) {
    console.error('Error deactivating tokens for ticket:', ticketId, e);
    return {
      ok: false,
      error: e,
    };
  }
}
serve(async function handler(req) {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', {
      status: 405,
    });
  const incomingSecret = req.headers.get('x-cron-secret');
  if (CRON_SECRET) {
    console.log('incomingSecret: ', incomingSecret, CRON_SECRET);
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
  }
  try {
    // 1. Fetch distinct pending ticket ids
    const ticketIds = await fetchPendingTicketIds(2000);
    if (!ticketIds || ticketIds.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          processed: 0,
          reason: 'no_pending_tickets',
        }),
        {
          status: 200,
        }
      );
    }
    // 2. Batch and call Expo receipts
    let processedCount = 0;
    const errors = [];
    for (let i = 0; i < ticketIds.length; i += TICKET_BATCH_SIZE) {
      const batchIds = ticketIds.slice(i, i + TICKET_BATCH_SIZE);
      const res = await fetchReceiptsFromExpo(batchIds);
      if (!res.ok) {
        // Save a generic error for each ticket in this batch
        console.error('Expo getReceipts non-ok:', res.status, res.body);
        for (const tid of batchIds) {
          // mark notifications for tid as failed with expo_response = res.body
          await updateNotificationRowsForTicket(tid, {
            status: 'failed',
            receipt: res.body,
          });
          errors.push({
            ticket: tid,
            error: res.body,
          });
        }
        continue;
      }
      // res.body expected like: { data: { "<ticket-id>": { status: 'ok' } }, errors?: ... }
      const receiptsObj = res.body && (res.body.data || res.body);
      if (!receiptsObj || typeof receiptsObj !== 'object') {
        console.warn('Unexpected receipts shape from Expo', res.body);
        for (const tid of batchIds) {
          await updateNotificationRowsForTicket(tid, {
            status: 'failed',
            receipt: res.body,
          });
          errors.push({
            ticket: tid,
            error: 'unexpected_receipts_shape',
            body: res.body,
          });
        }
        continue;
      }
      // Iterate tickets in batch (may include extra ids)
      for (const tid of batchIds) {
        const receipt = receiptsObj[tid];
        const interpretation = interpretReceipt(tid, receipt);
        // Update notifications table with interpretation
        const up = await updateNotificationRowsForTicket(tid, interpretation);
        if (!up.ok) {
          errors.push({
            ticket: tid,
            error: up.error,
          });
        } else {
          processedCount++;
        }
        // If not_registered, deactivate tokens for that ticket
        if (interpretation.status === 'not_registered') {
          const deact = await deactivatePushTokensByNotificationTicket(tid);
          if (!deact.ok)
            errors.push({
              ticket: tid,
              deactivate_error: deact.error,
            });
        }
      }
    } // end batches
    return new Response(
      JSON.stringify({
        ok: true,
        processed: processedCount,
        errors,
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error('update_receipts error:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(err),
      }),
      {
        status: 500,
      }
    );
  }
});
