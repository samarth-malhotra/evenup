// app/(auth)/login.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data.session) {
        await AsyncStorage.setItem('sb_session', JSON.stringify(data.session));
      }

      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Login error', err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('[OAUTH] starting signInWithOAuth');
      const redirectTo = 'https://auth.expo.io/@samarthmalhotra/evenup';

      const res = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      // log entire response
      console.log('[OAUTH] signInWithOAuth response:', JSON.stringify(res, null, 2));

      // SDK v2 often returns res.data.url or res.data?.url
      const url = (res as any)?.data?.url ?? (res as any)?.data?.provider_url ?? (res as any)?.url;
      const err = (res as any)?.error ?? (res as any)?.errorMessage;

      if (err) {
        console.warn('[OAUTH] returned error:', err);
        Alert.alert('OAuth error', String(err));
        return;
      }

      if (!url) {
        console.warn('[OAUTH] No URL returned by signInWithOAuth. Check Supabase & Google config.');
        Alert.alert(
          'OAuth started',
          'No browser URL returned. Check Metro logs. Also open Supabase Auth logs in dashboard.'
        );
        return;
      }

      console.log('[OAUTH] url ->', url);

      // try to open url in browser
      try {
        await Linking.openURL(url);
        console.log('[OAUTH] Linking.openURL succeeded');
      } catch (openErr) {
        console.warn('[OAUTH] Linking.openURL failed:', openErr);
        // copy to clipboard as fallback so user can paste into browser
        await Clipboard.setStringAsync(url);
        Alert.alert(
          'Open URL manually',
          'Could not open browser automatically. The URL was copied to clipboard — paste it into the phone browser.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.error('[OAUTH] unexpected error', e);
      console.error('[OAUTH] unexpected error', e);
      Alert.alert('Unexpected error', String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity onPress={onSubmit} style={styles.button} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
      </TouchableOpacity>

      <View style={{ marginVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>or</Text>
      </View>

      <TouchableOpacity onPress={signInWithGoogle} style={styles.googleButton}>
        <Image
          source={{
            uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg',
          }}
          style={styles.googleIcon}
        />
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/signup')}>
        <Text style={styles.link}>Don’t have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: '#0B5FFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  googleIcon: { width: 20, height: 20, marginRight: 8 },
  googleText: { fontWeight: '600', color: '#333' },
  link: { marginTop: 12, color: '#0B5FFF', textAlign: 'center' },
});
