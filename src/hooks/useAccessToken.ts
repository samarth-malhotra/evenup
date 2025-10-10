import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Hook to get and track the current Supabase access token.
 * Automatically updates when auth state changes.
 */
export const useAccessToken = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getAccessToken = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.warn('supabase.auth.getSession error:', error);
        setAccessToken(null);
        return null;
      }

      console.log('Current session user:', session?.user?.email);
      const token = session?.access_token ?? null;
      setAccessToken(token);
      return token;
    } catch (err) {
      console.warn('getAccessToken error:', err);
      setAccessToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch initial token
    getAccessToken();

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [getAccessToken]);

  return { accessToken, loading, refreshToken: getAccessToken };
};
