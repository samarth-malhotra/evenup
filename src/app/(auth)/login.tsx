// app/(auth)/login.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import GoogleLoginButton from '@/app/(auth)/GoogleLoginButton';
import { supabase } from '@/services/supabase/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput | null>(null);

  const validate = (): boolean => {
    let ok = true;
    setGeneralError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setGeneralError('Email is required');
      ok = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setGeneralError('Please enter a valid email');
        ok = false;
      }
    }

    if (!password) {
      setGeneralError('Password is required');
      ok = false;
    } else if (password.length < 6) {
      setGeneralError('Password must be at least 6 characters');
      ok = false;
    }

    return ok;
  };

  const onSubmit = async () => {
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

      // do NOT call router.replace here; AuthProvider will pick up session & layouts will Redirect
      if (data?.session) {
        // optional small feedback only
        Alert.alert('Signed in', 'Welcome back — finishing setup.');
      } else {
        Alert.alert('Signed in', 'Signed in — finishing setup.');
      }
    } catch (err: any) {
      setGeneralError(err?.message ?? String(err));
      Alert.alert('Unexpected error', err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = () => {
    // keep navigation to forgot-password if you have it
    router?.push?.('/forgot-password');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}>
      <View className="flex-1 justify-center p-5">
        <View className="rounded-2xl bg-white p-6 shadow-lg">
          <Text className="text-2xl font-extrabold text-slate-900">Welcome back</Text>
          <Text className="mt-1 text-sm text-slate-500">Sign in to continue to EvenUp</Text>

          <View className="h-4" />

          <TextInput
            placeholder="Email"
            placeholderTextColor="#9AA1B2"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!submitting}
          />

          <View className="flex-row items-center">
            <TextInput
              ref={passwordRef}
              placeholder="Password"
              placeholderTextColor="#9AA1B2"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              editable={!submitting}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} className="ml-2 p-2">
              <MaterialIcons
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {generalError ? <Text className="mt-3 text-red-600">{generalError}</Text> : null}

          <View className="h-3" />

          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            className={`items-center rounded-lg py-3 ${submitting ? 'bg-blue-400' : 'bg-blue-600'}`}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">Log In</Text>
            )}
          </Pressable>

          <TouchableOpacity onPress={onForgotPassword} className="items-center py-3">
            <Text className="text-sm font-medium text-slate-600">Forgot password?</Text>
          </TouchableOpacity>

          <View className="my-4 flex-row items-center">
            <View className="h-px flex-1 bg-slate-200" />
            <Text className="px-3 font-semibold text-slate-400">OR</Text>
            <View className="h-px flex-1 bg-slate-200" />
          </View>

          <GoogleLoginButton />

          <View className="mt-4 flex-row justify-center">
            <Text className="text-slate-600">Don’t have an account?</Text>
            <TouchableOpacity onPress={() => router?.push?.('/signup')}>
              <Text className="font-semibold text-blue-600"> Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
