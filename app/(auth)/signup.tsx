import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // If email confirmations are enabled, Supabase will send a verification link.
    // Once verified, session will be established.
    router.replace('/(tabs)/home');
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://auth.expo.io/@samarthmalhotra/evenup', // must match Expo owner/slug
        },
      });

      if (error) {
        Alert.alert('OAuth Error', error.message);
      }
      // After successful OAuth, Supabase will redirect → Expo → back into your app.
      // Your global auth listener (_layout.tsx) should catch SIGNED_IN and navigate to tabs.
    } catch (err: any) {
      Alert.alert('Unexpected Error', err.message ?? String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput placeholder="Full Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity onPress={onSubmit} style={styles.button}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={{ marginVertical: 16, alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>or</Text>
      </View>

      {/* Google Button */}
      <TouchableOpacity onPress={signInWithGoogle} style={styles.googleButton}>
        <Image
          source={{
            uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg',
          }}
          style={styles.googleIcon}
        />
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0B5FFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
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
