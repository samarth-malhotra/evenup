import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth button for Supabase + Expo.
 * - Uses a custom scheme redirect (make sure app.json has "scheme": "evenup")
 * - Supabase will complete the session after redirect back to app
 */
export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  // Make redirect URI matching your app scheme. Path is optional but recommended.
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'evenup', // <- ensure this matches app.json
    path: 'auth/callback',
  });

  const handlePress = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
        },
      });

      if (error) {
        Alert.alert('Google sign-in error', error.message);
        setLoading(false);
        return;
      }

      // Supabase returns a "url" to open; open in browser to complete OAuth flow
      if (data?.url) {
        // openAuthSessionAsync resolves when the web flow finishes/redirects
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        // result.type can be 'success', 'dismiss', 'cancel', etc.
        // Supabase will set the session on redirect; the auth listener in LoginScreen will persist it.
        if (result.type !== 'success') {
          // user cancelled or closed - nothing to do
          // show a short feedback only if needed
        }
      }
    } catch (err: any) {
      Alert.alert('Unexpected error', err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
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
  buttonPressed: {
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontWeight: '700',
    marginRight: 10,
    fontSize: 18,
    color: '#DB4437', // Google red-ish accent for the letter
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
