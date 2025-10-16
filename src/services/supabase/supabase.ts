// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

import { SecureStoreAdapter } from '@/features/auth/storage';
import { sb } from '@/services/supabase/constant';
import 'react-native-url-polyfill/auto';

if (!sb.baseUrl || !sb.anonkey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(sb.baseUrl, sb.anonkey, {
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
});
