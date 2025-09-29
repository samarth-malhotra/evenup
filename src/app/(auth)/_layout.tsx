// app/(auth)/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import { useAtomValue } from 'jotai';

import { authLoadingAtom } from '@/stores/atoms/auth';
import { userAtom } from '@/stores/atoms/user';

export default function AuthLayout() {
  const user = useAtomValue(userAtom);
  const isLoading = useAtomValue(authLoadingAtom);

  if (isLoading) return null; // waits until auth finishes

  if (user) {
    // already logged in -> go to app
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
