// app/(auth)/index.tsx
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function AuthIndex() {
  // redirect to login by default
  useEffect(() => {
    // optional side-effects
  }, []);

  return <Redirect href="/login" />;
}
