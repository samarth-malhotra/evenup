// app/(auth)/signup.tsx
import { supabase } from '@/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

      // do not navigate here — AuthProvider + (auth)/(tabs) layouts will redirect automatically
      if (data?.session) {
        // session available immediately (password sign-up) — we don't call router.replace
        // just show a small toast/alert to confirm success
        Alert.alert('Signed up', 'Account created. Finishing sign-in...');
      } else {
        // common case: confirmation email sent
        Alert.alert(
          'Check your email',
          'A confirmation link has been sent to your email. Please verify to complete sign up.'
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
        {/* keep link navigation — this is just for switching screens, not auth redirect */}
        <Text className="text-blue-600">Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}
