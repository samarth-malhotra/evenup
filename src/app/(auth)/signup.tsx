// app/(auth)/signup.tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '@/services/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const createProfileIfNeeded = async (user: any) => {
    if (!user?.id) return;

    // Build profile payload
    const profile = {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      avatar_url: null,
      currency: 'INR',
      language: 'en',
      theme: 'system',
      nickname: name || user.user_metadata?.full_name || null,
      status: 'active',
    };

    // Upsert: will insert if missing, or update existing row (safe for initial creation)
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(profile, { returning: 'minimal' }); // returning minimal to reduce payload

    if (upsertError) {
      console.error('Failed to create profile:', upsertError);
      // Non-blocking: we can still continue, but surface an alert optionally.
      // Alert.alert('Profile creation failed', upsertError.message);
    }
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // If signUp returned a session, the user is already signed in
      if (data?.session) {
        // Create profile row (id = user.id) once
        await createProfileIfNeeded(data.user);

        // Optionally show a success toast
        Alert.alert('Welcome', 'Account created and signed in.');

        // AuthProvider + layout will redirect automatically, but if you want immediate navigation:
        // router.replace('/(tabs)');
      } else {
        // Most common with email confirmation: session not available
        // You may still want to pre-create an "invited" profile row (optional).
        // If you want profile only after confirmation, don't create now.
        Alert.alert(
          'Check your email',
          'A confirmation link has been sent. Please verify your email to sign in.'
        );
      }
    } catch (err: any) {
      Alert.alert('Unexpected error', err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-white p-5">
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
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
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

      <TouchableOpacity onPress={() => router?.push?.('/login')} className="mt-4 items-center">
        <Text className="text-blue-600">Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}
