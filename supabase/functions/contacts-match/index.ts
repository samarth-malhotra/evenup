// functions/contacts-match/index.ts
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SERVICE_ROLE key');
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
});
serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
      });
    }
    const body = await req.json().catch(() => ({}));
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];
    if (!contacts.length) {
      return new Response(
        JSON.stringify({
          results: [],
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }
    // Build de-duped master lists of phone/email hashes
    const phoneSet = new Set();
    const emailSet = new Set();
    for (const c of contacts) {
      (c.phone_hashes || []).filter(Boolean).forEach((h) => phoneSet.add(h));
      (c.email_hashes || []).filter(Boolean).forEach((h) => emailSet.add(h));
    }
    const phoneHashes = Array.from(phoneSet);
    const emailHashes = Array.from(emailSet);
    // -------------------------
    // Use RPC to fetch candidate profiles for all hashes in one compact POST
    // Requires a SQL function `match_contact_hashes(text[])` on the DB (see SQL below)
    // -------------------------
    const candidatesMap = new Map(); // profileId -> row
    const allHashes = Array.from(new Set([...phoneHashes, ...emailHashes]));
    if (allHashes.length) {
      const { data: rpcRows, error: rpcErr } = await sb.rpc('match_contact_hashes', {
        hashes: allHashes,
      });
      if (rpcErr) {
        console.error('rpc match_contact_hashes error:', rpcErr);
        throw rpcErr;
      }
      (rpcRows || []).forEach((r) => {
        // rpc may return profile_id or id depending on implementation; normalize to id
        const id = String(r.profile_id ?? r.id ?? r.id);
        candidatesMap.set(id, r);
      });
    }
    // Build quick maps: hash -> profiles
    const phoneHashToProfiles = new Map();
    const emailHashToProfiles = new Map();
    for (const [, p] of candidatesMap) {
      if (p.phone_hash) {
        phoneHashToProfiles.set(
          p.phone_hash,
          (phoneHashToProfiles.get(p.phone_hash) || []).concat(p)
        );
      }
      if (p.email_hash) {
        emailHashToProfiles.set(
          p.email_hash,
          (emailHashToProfiles.get(p.email_hash) || []).concat(p)
        );
      }
    }
    // Helper: rank profiles by status -> updated_at -> id
    const statusRank = (s) => {
      if (!s) return 0;
      const map = {
        active: 3,
        invited: 2,
        placeholder: 2,
        suspended: 1,
      };
      return map[s] ?? 0;
    };
    const pickBestProfile = (profiles) => {
      if (!profiles || profiles.length === 0) return null;
      return profiles.slice().sort((a, b) => {
        const sa = statusRank(a?.status),
          sb = statusRank(b?.status);
        if (sa !== sb) return sb - sa; // higher status first
        const ta = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
        if (ta !== tb) return tb - ta; // recent first
        return (a?.id || '').localeCompare(b?.id || '');
      })[0];
    };
    // For each contact, apply algorithm and build result
    const results = contacts.map((c) => {
      const phoneHashesLocal = Array.from(new Set((c.phone_hashes || []).filter(Boolean)));
      const emailHashesLocal = Array.from(new Set((c.email_hashes || []).filter(Boolean)));
      // Collect candidate profiles that match any of the contact's hashes
      const byId = new Map();
      phoneHashesLocal.forEach((h) => {
        const arr = phoneHashToProfiles.get(h) || [];
        arr.forEach((p) => byId.set(p.id, p));
      });
      emailHashesLocal.forEach((h) => {
        const arr = emailHashToProfiles.get(h) || [];
        arr.forEach((p) => byId.set(p.id, p));
      });
      const candidateProfiles = Array.from(byId.values());
      // No candidate -> unmatched
      if (!candidateProfiles.length) {
        return {
          localId: c.localId,
          contact_name: c.contact_name ?? null,
          matched: false,
          phoneMatched: false,
          emailMatched: false,
          match_source: null,
          profile_id: null,
          status: null,
          ambiguous: false,
          matched_profiles: null,
        };
      }
      // Check for exact both-hash match (same profile must match one phone_hash and one email_hash)
      let selected = null;
      let phoneMatched = false;
      let emailMatched = false;
      const bothMatches = [];
      for (const p of candidateProfiles) {
        const phoneMatch =
          phoneHashesLocal.length && p.phone_hash && phoneHashesLocal.includes(p.phone_hash);
        const emailMatch =
          emailHashesLocal.length && p.email_hash && emailHashesLocal.includes(p.email_hash);
        if (phoneMatch && emailMatch) bothMatches.push(p);
      }
      if (bothMatches.length) {
        selected = pickBestProfile(bothMatches);
        phoneMatched = true;
        emailMatched = true;
      } else {
        // No both-match. Prefer phone matches
        const phoneCandidates = candidateProfiles.filter(
          (p) => p.phone_hash && phoneHashesLocal.includes(p.phone_hash)
        );
        if (phoneCandidates.length) {
          selected = pickBestProfile(phoneCandidates);
          phoneMatched = true;
          if (selected?.email_hash && emailHashesLocal.includes(selected.email_hash))
            emailMatched = true;
        } else {
          // Fallback to email matches
          const emailCandidates = candidateProfiles.filter(
            (p) => p.email_hash && emailHashesLocal.includes(p.email_hash)
          );
          if (emailCandidates.length) {
            selected = pickBestProfile(emailCandidates);
            emailMatched = true;
            if (selected?.phone_hash && phoneHashesLocal.includes(selected.phone_hash))
              phoneMatched = true;
          }
        }
      }
      // Ambiguity detection: detect multiple distinct profiles matching different hash types
      let ambiguous = false;
      let ambiguousProfiles = null;
      if (selected) {
        const phoneMatchedProfiles = phoneHashesLocal.flatMap(
          (h) => phoneHashToProfiles.get(h) || []
        );
        const emailMatchedProfiles = emailHashesLocal.flatMap(
          (h) => emailHashToProfiles.get(h) || []
        );
        const distinctSet = new Map();
        phoneMatchedProfiles.concat(emailMatchedProfiles).forEach((p) => distinctSet.set(p.id, p));
        const distinctProfiles = Array.from(distinctSet.values());
        if (distinctProfiles.length > 1) {
          const phoneIds = new Set((phoneMatchedProfiles || []).map((p) => p.id));
          const emailIds = new Set((emailMatchedProfiles || []).map((p) => p.id));
          const phoneDiff = Array.from(phoneIds).some((id) => id !== selected.id);
          const emailDiff = Array.from(emailIds).some((id) => id !== selected.id);
          if (phoneDiff || emailDiff) {
            ambiguous = true;
            ambiguousProfiles = distinctProfiles.map((p) => ({
              id: p.id,
              display_name: p.display_name ?? null,
              avatar_url: p.avatar_url ?? null,
              status: p.status ?? null,
            }));
          }
        }
      }
      return {
        localId: c.localId,
        contact_name: c.contact_name ?? null,
        matched: !!selected,
        phoneMatched,
        emailMatched,
        match_source: selected
          ? phoneMatched && emailMatched
            ? 'both'
            : phoneMatched
              ? 'phone'
              : 'email'
          : null,
        profile_id: selected ? (selected.profile_id ?? selected.id) : null,
        status: selected ? (selected.status ?? null) : null,
        ambiguous: !!ambiguous,
        matched_profiles: ambiguous ? ambiguousProfiles : null,
      };
    });
    return new Response(
      JSON.stringify({
        results,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('contacts-match error:', err);
    const payload = {
      error: err?.message ? String(err.message) : String(err),
    };
    if (err?.stack) payload.stack = String(err.stack);
    return new Response(JSON.stringify(payload), {
      status: 500,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
});
