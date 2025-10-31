// enqueue_notification/index.ts
// Supabase Edge Function (Deno/TypeScript)
// Small change: for subtype 'group_member_deleted' we include the deleted member (data.memberId)
// in the recipients list (even though the general member fetch excludes status = 'deleted').
//
// Required env:
//  - SUPABASE_URL
//  - SUPABASE_SERVICE_ROLE_KEY
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.28.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in environment');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'x-edge-function': 'enqueue_notification',
    },
  },
});
serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Method Not Allowed',
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
          ok: false,
          error: 'Invalid JSON body',
        }),
        {
          status: 400,
        }
      );
    }
    // Required request keys
    const { actorId, groupId, groupName, subtype, locale = 'en', data = {} } = body;
    if (!actorId || typeof actorId !== 'string') {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing or invalid 'actorId' (required)",
        }),
        {
          status: 400,
        }
      );
    }
    if (!groupId || typeof groupId !== 'string') {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing or invalid 'groupId' (required)",
        }),
        {
          status: 400,
        }
      );
    }
    if (!subtype || typeof subtype !== 'string') {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing or invalid 'subtype' (required)",
        }),
        {
          status: 400,
        }
      );
    }
    // Normalize base data and ensure group_id lives inside data JSON
    const baseData =
      typeof data === 'object' && data !== null
        ? {
            ...data,
          }
        : {};
    baseData.group_name = groupName;
    baseData.group_id = groupId; // group_id kept inside data JSON; notifications table top-level group_id is removed
    const groupSubtypes = new Set(['group_member_added', 'group_member_deleted', 'group_deleted']);
    const expenseSubtypes = new Set(['expense_created', 'expense_deleted', 'expense_updated']);
    // Expense subtypes: validate transaction and enrich baseData.transaction
    if (expenseSubtypes.has(subtype)) {
      const transactionId =
        baseData.transactionId ??
        baseData.transaction_id ??
        baseData.transcationId ??
        baseData.transcation_id ??
        null;
      if (!transactionId || typeof transactionId !== 'string') {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'missing_transaction_id',
            message: 'transactionId must be provided inside data for expense subtypes',
          }),
          {
            status: 400,
          }
        );
      }
      const { data: txRow, error: txErr } = await supabase
        .from('transactions')
        .select('id, description, amount, paid_by, group_id, currency')
        .eq('id', transactionId)
        .limit(1)
        .maybeSingle();
      if (txErr) {
        console.error('Error fetching transaction:', txErr);
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'failed_fetch_transaction',
            message: String(txErr),
          }),
          {
            status: 500,
          }
        );
      }
      if (!txRow) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'transaction_not_found',
            message: 'No transaction found for provided transactionId',
          }),
          {
            status: 400,
          }
        );
      }
      if (txRow.group_id !== groupId) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'transaction_group_mismatch',
            message: 'transaction.group_id does not match provided groupId',
          }),
          {
            status: 400,
          }
        );
      }
      baseData.transaction = {
        id: txRow.id,
        description: txRow.description ?? null,
        amount: txRow.amount ?? null,
        paid_by: txRow.paid_by ?? null,
        group_id: txRow.group_id ?? null,
        currency: txRow.currency ?? null,
      };
      // NOTE: caller should provide baseData.group_name if desired; we no longer query groups table
      if (typeof txRow.currency !== 'undefined' && txRow.currency !== null) {
        baseData.currency = txRow.currency;
      }
    }
    // Resolve recipients from group_members excluding status = 'deleted' and 'left
    const { data: members, error: membersErr } = await supabase
      .from('group_members')
      .select('user_id, status')
      .eq('group_id', groupId)
      .neq('status', 'deleted')
      .neq('status', 'left'); // exclude deleted in the general fetch
    if (membersErr) {
      console.error('Error fetching group members:', membersErr);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'failed_fetch_group_members',
          message: String(membersErr),
        }),
        {
          status: 500,
        }
      );
    }
    let resolvedRecipients = (members || []).map((m) => ({
      user_id: m.user_id,
    }));
    // Special-case: when a member was deleted, include that deleted user (data.memberId) as a recipient too
    if (subtype === 'group_member_deleted') {
      const memberId =
        baseData.memberId ?? baseData.member_id ?? baseData.memberId?.toString?.() ?? null;
      if (memberId && typeof memberId === 'string') {
        try {
          // fetch the specific group_members row for the provided memberId regardless of status
          const { data: deletedMemberRow, error: deletedMemberErr } = await supabase
            .from('group_members')
            .select('user_id, status')
            .eq('group_id', groupId)
            .eq('user_id', memberId)
            .limit(1)
            .maybeSingle();
          if (deletedMemberErr) {
            // don't fail the whole request for this — just log and continue
            console.error('Error fetching specific deleted member row:', deletedMemberErr);
          } else if (deletedMemberRow) {
            // include the deleted user in recipients list (if not already present)
            const already = resolvedRecipients.some((r) => r.user_id === deletedMemberRow.user_id);
            if (!already)
              resolvedRecipients.push({
                user_id: deletedMemberRow.user_id,
              });
          } else {
            // If not found in group_members, still attempt to include the memberId (best-effort)
            // This branch is optional — adjust to your policy. We'll include it to ensure the user gets notified.
            const already = resolvedRecipients.some((r) => r.user_id === memberId);
            if (!already)
              resolvedRecipients.push({
                user_id: memberId,
              });
          }
        } catch (e) {
          console.error('Unexpected error while ensuring deleted member inclusion:', e);
          // best-effort: include the memberId anyway
          const already = resolvedRecipients.some((r) => r.user_id === memberId);
          if (!already)
            resolvedRecipients.push({
              user_id: memberId,
            });
        }
      }
    }
    // Exclude actor from push recipients (actor gets an actor-row)
    const actorIdStr = actorId ?? null;
    if (actorIdStr) {
      resolvedRecipients = resolvedRecipients.filter((r) => r.user_id !== actorIdStr);
    }
    // Deduplicate recipients
    const dedup = new Map();
    for (const r of resolvedRecipients) dedup.set(r.user_id, r);
    resolvedRecipients = Array.from(dedup.values());
    // Single notification_group_id for the whole request
    const notification_group_id = crypto.randomUUID();
    // Build insert rows (note: top-level group_id column omitted; group_id stored inside data JSON)
    const nowIso = new Date().toISOString();
    const insertRows = [];
    for (const r of resolvedRecipients) {
      const perRecipientData = {
        ...baseData,
      };
      perRecipientData.group_id = groupId; // ensure present in data JSON
      insertRows.push({
        notification_group_id,
        actor_id: actorIdStr,
        // top-level group_id intentionally omitted
        subtype,
        user_id: r.user_id,
        title: null,
        body: null,
        data: perRecipientData,
        locale,
        device_token: null,
        platform: null,
        ticket_id: null,
        expo_response: null,
        status: 'pending',
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
    // Insert actor row with status "actor" (also includes data.group_id)
    const actorRow = actorIdStr
      ? {
          notification_group_id,
          actor_id: actorIdStr,
          subtype,
          user_id: actorIdStr,
          title: null,
          body: null,
          data: {
            ...baseData,
            group_id: groupId,
          },
          locale,
          device_token: null,
          platform: null,
          ticket_id: null,
          expo_response: null,
          status: 'skipped_self',
          created_at: nowIso,
          updated_at: nowIso,
        }
      : null;
    if (insertRows.length === 0 && !actorRow) {
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            created: 0,
            notification_group_id,
          },
        }),
        {
          status: 200,
        }
      );
    }
    const allRowsToInsert = [...insertRows];
    if (actorRow) allRowsToInsert.push(actorRow);
    const { data: inserted, error: insertErr } = await supabase
      .from('notifications')
      .insert(allRowsToInsert)
      .select('id, user_id, status');
    if (insertErr) {
      console.error('Failed to insert notifications', insertErr);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Failed to insert notifications',
          message: String(insertErr),
        }),
        {
          status: 500,
        }
      );
    }
    const finalInserted = inserted || [];
    // Build messages for enqueue RPC (include actor rows)
    const msgs = [];
    for (const row of finalInserted) {
      // if (row.status === 'skipped_self') continue;
      msgs.push(
        JSON.stringify({
          notification_id: row.id,
        })
      );
    }
    const enqueuedResults = [];
    if (msgs.length > 0) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('enqueue_notifications', {
          messages: msgs,
        });
        if (rpcErr) {
          console.error('enqueue_notifications rpc error:', rpcErr);
          // if (row.status !== "actor")
          for (const row of finalInserted)
            enqueuedResults.push({
              notification_id: row.id,
              enqueued: false,
              error: rpcErr,
            });
        } else {
          enqueuedResults.push({
            enqueued: true,
            rpc: rpcData,
          });
        }
      } catch (e) {
        console.error('Unexpected enqueue rpc exception:', e);
        for (const row of finalInserted)
          if (row.status !== 'actor')
            enqueuedResults.push({
              notification_id: row.id,
              enqueued: false,
              error: String(e),
            });
      }
    }
    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          notification_group_id,
          created: finalInserted.length,
          inserted: finalInserted,
          enqueued: enqueuedResults,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('enqueue_notification error:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'internal_server_error',
        message: String(err),
      }),
      {
        status: 500,
      }
    );
  }
});
