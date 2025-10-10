// src/services/contacts.ts
import axios from 'axios';

const CONTACTS_MATCH_ENDPOINT = `https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/contacts-match`;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export async function callContactsMatchHashedContacts(
  contacts: any[],
  opts?: { token?: string | null; timeoutMs?: number }
) {
  console.log('[callContactsMatch] payload:', contacts.length);
  const { token, timeoutMs = 20000 } = opts ?? {};
  if (!token) return;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (ANON_KEY) {
    headers['apikey'] = ANON_KEY;
    headers['Authorization'] = `Bearer ${ANON_KEY}`;
  }

  try {
    const resp = await axios.post(
      CONTACTS_MATCH_ENDPOINT,
      { contacts },
      { headers, timeout: timeoutMs }
    );
    console.log('[callContactsMatch] status', resp.status, 'results', resp.data?.results?.length);
    return resp.data; // { results: [...] }
  } catch (err: any) {
    console.error('[callContactsMatch] axios error:', err?.message);
    if (err.response) {
      console.error('[callContactsMatch] response.status:', err.response.status);
      console.error('[callContactsMatch] response.data:', err.response.data);
    }
    throw err;
  }
}
