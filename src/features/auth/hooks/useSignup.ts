// // api/auth.ts
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { edge } from '@/services/supabase/constant';
import { edgeFunction } from '@/services/supabase/edgeFunctions';
import { supabase } from '@/services/supabase/supabase';
import { SupaError } from '@/services/supabase/supaError';

// types - adjust to your project's types
export type SignupPayload = {
  email?: string | null;
  phone?: string | null;
  password: string;
  full_name?: string | null;
  invited_by?: string | null;
  metadata?: Record<string, any> | null;
  theme?: string;
  language?: string;
  currency?: string;
};

export type SignupResponse = {
  user_id: string;
  session: {
    access_token?: string;
    refresh_token?: string;
    [k: string]: any;
  } | null;
};

/**
 * Call the signup edge function and return the typed data.
 * It uses your existing edgeFunction which validates the RPC wrapper.
 */
async function signup(payload: SignupPayload): Promise<SignupResponse> {
  // edgeFunction will throw SupaError on non-ok responses or missing data,
  // so callers can catch and handle as needed.
  const data = await edgeFunction<SignupResponse>(edge.signup, {
    method: 'POST',
    body: payload,
  });

  // edgeFunction enforces the RPC wrapper and returns response.data
  return data as SignupResponse;
}

export default function useSignupHandler() {
  const router = useRouter();
  //   console.log('new signup');
  async function handleSignup(payload: SignupPayload) {
    try {
      const resp = await signup(payload);

      // resp.session may be null or contain tokens
      const session = resp.session ?? null;
      if (session?.access_token && session?.refresh_token) {
        // Using supabase-js v2 client (browser / react native)
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        // Now user is signed in locally. Redirect to app root
        router.replace('/(tabs)');
        return;
      }

      // fallback: user created but no session provided
      Alert.alert('Account created', 'Please login with your credentials.');
    } catch (err: any) {
      console.log('error: ', err);
      // edgeFunction throws SupaError (or a raw Error) on HTTP/RPC errors.
      // The server returns error codes like "conflict" and messages like
      // "The following fields are already in use: email", so we try to detect them.
      if (err instanceof SupaError) {
        // SupaError carries a code (second arg from edgeFunction throws) and message
        const msg = err.message ?? 'Signup failed';

        // crude but pragmatic detection for conflict (409). Your server returns
        // error: "conflict" and message with friendly text — check both.
        if (
          msg?.toLowerCase().includes('conflict') ||
          msg?.toLowerCase().includes('already in use')
        ) {
          Alert.alert('Already registered', msg);
          return;
        }

        Alert.alert('Signup failed', msg);
        return;
      }

      // fallback unknown error
      Alert.alert('Signup failed', err?.message ?? 'Unexpected error');
    }
  }

  return { handleSignup };
}
