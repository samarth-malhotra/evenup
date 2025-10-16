// app/(auth)/signup.tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import useSignupHandler from '@/features/auth/hooks/useSignup';
import { normalizeEmail, normalizePhone } from '@/utils/normalise';

type SignupPayload = {
  email: string;
  phone?: string | null;
  password: string;
  full_name?: string | null;
  invited_by?: string | null;
  metadata?: Record<string, any> | null;
  language?: string;
  currency?: string;
  theme?: string;
};

export default function SignupScreen() {
  const router = useRouter();
  const { handleSignup } = useSignupHandler();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalize = (v: string | null | undefined): string | null => {
    if (!v) return null;
    const t = v.trim();
    return t === '' ? null : t;
  };

  const validate = (): boolean => {
    if (!email) {
      Alert.alert('Missing email', 'Email is required.');
      return false;
    }
    const emailTrim = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return false;
    }

    if (!password || password.length < 6) {
      Alert.alert('Invalid password', 'Password must be at least 6 characters.');
      return false;
    }

    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 6) {
        Alert.alert('Invalid phone', 'Please enter a valid phone number.');
        return false;
      }
    }

    return true;
  };

  const onSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    const payload: SignupPayload = {
      email: normalizeEmail(email)!,
      password,
      full_name: normalize(name),
      phone: normalizePhone(`91${phone}`),
    };
    await handleSignup(payload);
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 justify-center bg-white p-5">
      <Text className="mb-5 text-2xl font-bold text-slate-900">Create Account</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
      />

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email (required)"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
      />

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone (optional)"
        keyboardType="phone-pad"
        autoComplete="tel"
        className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        textContentType="password"
        className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
      />

      <TouchableOpacity
        onPress={onSubmit}
        disabled={submitting}
        className={`items-center rounded-lg py-3 ${submitting ? 'bg-blue-400' : 'bg-blue-600'}`}
        activeOpacity={0.85}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-white">Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')} className="mt-4 items-center">
        <Text className="text-blue-600">Already have an account? Log in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
