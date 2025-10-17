// api/auth.ts
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { edge } from '@/services/supabase/constant';
import { edgeFunction } from '@/services/supabase/edgeFunctions';
import { supabase } from '@/services/supabase/supabase';
import { SupaError } from '@/services/supabase/supaError';

// ---------- types ----------
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

// ---------- helper: call edge function ----------
async function signup(payload: SignupPayload): Promise<SignupResponse> {
  // edgeFunction is expected to throw SupaError on non-ok responses.
  const data = await edgeFunction<SignupResponse>(edge.signup, {
    method: 'POST',
    body: payload,
  });

  // Ensure we get expected shape (edgeFunction should already validate)
  return data as SignupResponse;
}

// ---------- hook ----------
export default function useSignupHandler() {
  const router = useRouter();

  async function trySignInWithCredentials(
    emailOrPhone: { email?: string | null; phone?: string | null },
    password: string
  ) {
    try {
      // prefer phone if present and you have phone-based auth enabled,
      // otherwise use email. Supabase SDK currently supports email+password
      // by default — for phone you'd need pass magic link / OTP flow configured.
      const { phone, email } = emailOrPhone;
      if (phone && phone.trim()) {
        // If you support phone + password sign-in, adjust this to your auth flow.
        // Most Supabase projects use email/password; phone usually requires OTP.
        // We'll attempt email sign-in if phone-based password sign-in is not configured.
        // Fallback to email if phone isn't a workable route.
      }

      const userEmail = email ?? '';

      if (!userEmail) {
        return {
          ok: false,
          reason: 'missing_identifier',
          message: 'No email available to sign in.',
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });

      if (error) {
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('confirmation')) {
          return { ok: false, reason: 'confirm_email', message: error.message };
        }
        return { ok: false, reason: 'signin_failed', message: error.message ?? String(error) };
      }

      const session = (data as any)?.session ?? null;

      // If session tokens exist, ensure client has them (setSession is safe).
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      return { ok: true, session: session ?? null };
    } catch (e: any) {
      return { ok: false, reason: 'exception', message: e?.message ?? String(e) };
    }
  }

  async function handleSignup(payload: SignupPayload) {
    try {
      await signup(payload);
      // No session from server — try sign-in with the credentials user provided.
      const identifier = {
        email: payload.email ?? null,
        phone: payload.phone ?? null,
      };
      const password = payload.password;

      if (!password) {
        // Edge-case: account created but no usable credential present for auto-login
        Alert.alert('Account created', 'Please log in with your credentials.');
        return;
      }

      const signInResult = await trySignInWithCredentials(identifier, password);

      if (signInResult.ok) {
        router.replace('/(tabs)');
        return;
      }

      // Sign-in failed — respond to specific reasons
      if (signInResult.reason === 'confirm_email') {
        Alert.alert(
          'Confirm your email',
          "We've created your account. Please check your email and confirm before logging in."
        );
        return;
      }

      if (signInResult.reason === 'missing_identifier') {
        Alert.alert('Account created', 'Please log in with your credentials.');
        return;
      }

      // Generic fallback message (use server/session message if present)
      Alert.alert(
        'Account created',
        signInResult.message ?? 'Account created. Please log in with your credentials.'
      );
    } catch (err: any) {
      if (err instanceof SupaError) {
        const msg = err.message ?? 'Signup failed';
        // common case: conflict / already exists
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
      Alert.alert('Signup failed', err?.message ?? 'Unexpected error');
    }
  }

  return { handleSignup };
}
