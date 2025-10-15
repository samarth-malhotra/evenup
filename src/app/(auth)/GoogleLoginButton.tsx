// app/(auth)/GoogleLoginButton.tsx
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { supabase } from '@/services/supabase/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  // detect environment (prefer new API, fallback to appOwnership)
  const execEnv = (Constants as any).executionEnvironment as string | undefined;
  const appOwnership = (Constants as any).appOwnership as string | undefined;
  const isExpoGo = execEnv === 'storeClient' || appOwnership === 'expo';

  // Explicit redirect URIs — avoid exp:// or localhost defaults
  // When testing in Expo Go, use the auth.expo.io proxy (must be in Google + Supabase redirect lists).
  // Otherwise use the custom scheme for your app (ensure "scheme": "evenup" in app.json).
  const EXPO_PROXY_REDIRECT = 'https://auth.expo.io/@samarthmalhotra/evenup';
  const CUSTOM_SCHEME_REDIRECT = 'evenup://auth/callback';

  const redirectUri = isExpoGo ? EXPO_PROXY_REDIRECT : CUSTOM_SCHEME_REDIRECT;

  const handlePress = async () => {
    console.log('[GoogleLogin] pressed, redirectUri=', redirectUri);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri },
      });

      console.log('[GoogleLogin] signInWithOAuth ->', { data, error });

      if (error) {
        Alert.alert('Google sign-in error', error.message);
        setLoading(false);
        return;
      }

      if (!data?.url) {
        Alert.alert(
          'No auth URL returned',
          "Supabase didn't return an auth url. Check console logs."
        );
        setLoading(false);
        return;
      }

      // Open the OAuth web flow (auth.expo.io or Google)
      await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      // DO NOT call supabase.getSession() or persist session here.
      // AuthProvider will handle the session change once Supabase SDK persists it via the storage adapter.
    } catch (err: any) {
      console.error('[GoogleLogin] unexpected:', err);
      Alert.alert('Unexpected error', err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      className="items-center rounded-lg border border-slate-200 bg-white py-3"
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
      <View className="flex-row items-center">
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text className="mr-3 text-xl font-bold text-red-500">G</Text>
            <Text className="text-base font-semibold">Continue with Google</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}
