import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

import GoogleLoginButton from './GoogleLoginButton';

const SESSION_KEY = 'sb_session';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  // Persist session to AsyncStorage when Supabase auth state changes,
  // so OAuth sign-in is also captured.
  useEffect(() => {
    let isMounted = true;
    const setSessionInStorage = async (session: any | null) => {
      if (!isMounted) return;
      if (session) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem(SESSION_KEY);
      }
    };

    // Check existing session once at mount
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await setSessionInStorage(data?.session ?? null);
      } catch (err) {
        // ignore
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    })();

    // Subscribe to changes (SIGN_IN / SIGNED_IN / SIGNED_OUT)
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await setSessionInStorage(session ?? null);
      if (_event === 'SIGNED_IN') {
        // navigate when signed in
        router.replace('/(tabs)');
      }
      if (_event === 'SIGNED_OUT') {
        // optionally navigate to login
      }
    });

    return () => {
      isMounted = false;
      try {
        listener?.subscription?.unsubscribe?.();
      } catch {
        // noop
      }
    };
  }, [router]);

  // Basic email validation
  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please provide a valid email';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const onSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Validation error', validationError);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        Alert.alert('Login error', error.message);
        return;
      }

      if (data?.session) {
        // store the session locally (so your app can persist it)
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
        router.replace('/(tabs)');
      } else {
        // In case the session is not present but sign-in triggered an OAuth or similar
        Alert.alert('Login', 'Signed in but no session returned. Waiting for auth update...');
      }
    } catch (err: any) {
      Alert.alert('Unexpected error', err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Log In</Text>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          textContentType="emailAddress"
          importantForAutofill="yes"
          accessibilityLabel="Email"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          textContentType="password"
          accessibilityLabel="Password"
        />

        <Pressable
          onPress={onSubmit}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Log In</Text>
          )}
        </Pressable>

        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.line} />
        </View>

        <GoogleLoginButton />
      </View>
      <Pressable onPress={() => router.push('/signup')} style={styles.linkWrap}>
        <Text style={styles.linkText}>Don’t have an account? Sign up</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F8FAFF' },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderColor: '#E6E9EE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#0B5FFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  buttonPressed: { opacity: 0.9 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#EAECEF' },
  orText: { marginHorizontal: 10, color: '#9AA1B2', fontWeight: '600' },
  linkWrap: { marginTop: 14, alignItems: 'center' },
  linkText: { color: '#0B5FFF', fontWeight: '600' },
});
