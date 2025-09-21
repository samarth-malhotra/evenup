import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Button } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleLoginButton() {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'evenup' }); // 👈 matches app.json scheme

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // This opens Google login in browser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          // ✅ Supabase auto-handles session after redirect
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            Alert.alert('Login successful', `Welcome ${session.user.email}`);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return <Button title="Continue with Google" onPress={handleLogin} />;
}
