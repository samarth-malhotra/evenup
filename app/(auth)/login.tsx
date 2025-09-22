// app/(auth)/login.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput | null>(null);

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
        router.replace('/(tabs)');
      }
      if (_event === 'SIGNED_OUT') {
        // no-op
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

  // Validation helper
  const validate = (): boolean => {
    let ok = true;
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email is required');
      ok = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid email');
        ok = false;
      }
    }

    if (!password) {
      setPasswordError('Password is required');
      ok = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      ok = false;
    }

    return ok;
  };

  const onSubmit = async () => {
    // hide keyboard
    Keyboard.dismiss();

    if (!validate()) return;

    setSubmitting(true);
    setGeneralError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setGeneralError(error.message ?? 'Login failed');
        Alert.alert('Login error', error.message ?? 'Login failed');
        return;
      }

      if (data?.session) {
        // store the session locally (so your app can persist it)
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
        router.replace('/(tabs)');
      } else {
        // Occasionally signInWithPassword may not return session immediately
        Alert.alert('Login', 'Signed in, waiting for session update...');
      }
    } catch (err: any) {
      setGeneralError(err?.message ?? String(err));
      Alert.alert('Unexpected error', err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = () => {
    // navigate to a forgot password screen (create one if you don't have)
    router.push('/forgot-password');
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
      style={styles.screen}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to EvenUp</Text>

          <View style={{ height: 18 }} />

          <TextInput
            placeholder="Email"
            placeholderTextColor="#9AA1B2"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, emailError ? styles.inputError : null]}
            textContentType="emailAddress"
            importantForAutofill="yes"
            accessibilityLabel="Email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!submitting}
            testID="emailInput"
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <View style={{ height: 8 }} />

          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              placeholder="Password"
              placeholderTextColor="#9AA1B2"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={[styles.input, passwordError ? styles.inputError : null, { flex: 1 }]}
              textContentType="password"
              accessibilityLabel="Password"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              editable={!submitting}
              testID="passwordInput"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              style={styles.eyeButton}>
              <MaterialIcons
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

          {/* ===== Primary Login Button (visible) ===== */}
          <View style={{ height: 12 }} />
          <Pressable
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              submitting && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            disabled={submitting}
            testID="loginButton">
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Log In</Text>
            )}
          </Pressable>

          {/* Forgot password placed AFTER the login button */}
          <TouchableOpacity
            onPress={onForgotPassword}
            accessibilityRole="link"
            style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {generalError ? <Text style={styles.generalError}>{generalError}</Text> : null}

          <View style={styles.orRow}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>

          <GoogleLoginButton />

          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>Don’t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signUpLink}> Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const CARD_PADDING = 22;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFF' },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff',
    padding: CARD_PADDING,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 6 },

  input: {
    borderWidth: 1,
    borderColor: '#E6E9EE',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#F97373',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  eyeButton: { marginLeft: 8, padding: 6 },

  primaryButton: {
    backgroundColor: '#0B5FFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryText: { color: '#fff', fontWeight: '700' },
  buttonPressed: { opacity: 0.9 },

  forgotWrap: { paddingVertical: 10, alignItems: 'center' },
  forgotText: { color: '#6B7280', fontWeight: '600' },

  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: '#EAECEF' },
  orText: { marginHorizontal: 12, color: '#9AA1B2', fontWeight: '600' },

  fieldError: { color: '#DC2626', marginTop: 6, marginBottom: 2, fontSize: 13 },
  generalError: { color: '#DC2626', marginTop: 8, textAlign: 'center' },

  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  signUpText: { color: '#6B7280' },
  signUpLink: { color: '#0B5FFF', fontWeight: '700' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
