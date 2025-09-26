// app/(auth)/_layout.tsx
import { Redirect, Slot } from 'expo-router';

import { useAuth } from '@/features/auth/components/AuthProvider';
// import { useAuth } from '@/lib/auth/AuthProvider';

export default function AuthLayout() {
  const { isLoading, user } = useAuth();

  if (isLoading) return null; // waits until auth finishes

  if (user) {
    // already logged in -> go to app
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
