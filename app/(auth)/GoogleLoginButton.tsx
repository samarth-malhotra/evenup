import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

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

      // Show a short alert so you know it's opening
      Alert.alert(
        'Opening auth URL',
        data.url.slice(0, 120) + (data.url.length > 120 ? '...' : '')
      );

      // open web flow (auth.expo.io or google)
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      console.log('[GoogleLogin] openAuthSessionAsync result:', result);
      Alert.alert('Auth session result', JSON.stringify(result));

      // After redirect, check session
      const sessionResp = await supabase.auth.getSession();
      console.log('[GoogleLogin] supabase.getSession ->', sessionResp);
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
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      disabled={loading}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={styles.logo}>G</Text>
            <Text style={styles.text}>Continue with Google</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  content: { flexDirection: 'row', alignItems: 'center' },
  logo: { fontWeight: '700', marginRight: 10, fontSize: 18, color: '#DB4437' },
  text: { fontSize: 15, fontWeight: '600' },
});
