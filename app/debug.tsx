// app/debug.tsx
import { useState } from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

function parseFragment(fragment: string) {
  if (!fragment) return {};
  const hash = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  return Object.fromEntries(
    hash
      .split('&')
      .map((kv) => kv.split('=').map((s) => decodeURIComponent(s ?? '')))
      .filter((pair) => pair.length === 2)
  );
}

export default function DebugScreen() {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onApply = async () => {
    try {
      const fragmentStart = url.indexOf('#');
      const fragment = fragmentStart >= 0 ? url.substring(fragmentStart) : url;
      const params = parseFragment(fragment);
      const access_token = params['access_token'];
      const refresh_token = params['refresh_token'];

      if (!access_token) {
        Alert.alert(
          'No access_token',
          'Paste the full auth.expo.io URL (including #access_token=...)'
        );
        return;
      }

      setLoading(true);
      const result = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token ?? undefined,
      } as any);

      if ((result as any)?.error) {
        Alert.alert('setSession error', (result as any).error.message ?? JSON.stringify(result));
      } else {
        Alert.alert('Signed in', 'Session set — you should be signed in now.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Debug: Manual OAuth Handoff</Text>
        <Text style={styles.help}>
          Paste the full URL you copied from the phone browser (the auth.expo.io URL that includes
          #access_token=...).
        </Text>

        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="Paste full auth.expo.io URL here"
          style={styles.input}
          multiline
          numberOfLines={4}
        />

        <View style={styles.buttons}>
          <Button
            title={loading ? 'Applying...' : 'Apply token (setSession)'}
            onPress={onApply}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  help: { marginBottom: 12, color: '#444' },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  buttons: { marginTop: 12 },
});
