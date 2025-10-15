// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

import { SecureStoreAdapter } from '@/features/auth/storage';
import 'react-native-url-polyfill/auto';

// console.log('CONFIG.SUPABASE_URL: ', CONFIG.SUPABASE_URL);
// console.log('CONFIG.SUPABASE_ANON_KEY: ', CONFIG.SUPABASE_ANON_KEY);
// export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const SUPABASE_URL = 'https://wrnepxzmmuzcsmjmadli.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybmVweHptbXV6Y3Ntam1hZGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjE0NTYsImV4cCI6MjA3NDAzNzQ1Nn0.NcrD3dr1bxmHzH81ThzGbXxlAnS5qBIAod618CvSSvs';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
}
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY,);
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // persist session between app restarts
    persistSession: true,
    // automatically refresh the access token when needed
    autoRefreshToken: true,
    // Wire storage adapter for RN so sessions persist safely
    storage: SecureStoreAdapter as any,
  },
  // global headers to help backend identify platform
  global: {
    headers: {
      'x-client-platform': 'react-native',
      'x-client-name': 'EvenUp',
    },
  },
  // Optionally set detectSessionInUrl: false if you don't want url-based session parsing
});

// // helper: unwrap supabase result or throw
// export async function supabaseOrThrow<T = any>(req: Promise<{ data: T | null; error: any }>) {
//   const { data, error } = await req;
//   if (error) throw error;
//   return data as T;
// }
