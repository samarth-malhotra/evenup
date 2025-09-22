// app/_layout.tsx
import { QueryProvider } from '@/api/helper/queryClient';
import { ThemeProvider } from '@/components/ThemeProvider';
import { supabase } from '@/supabase';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../../global.css';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const topSegment = segments[0] ?? '';

        if (!session) {
          const isOnAuthRoute =
            topSegment === 'login' || topSegment === 'signup' || topSegment === '(auth)';
          if (!isOnAuthRoute) router.replace('/login');
        } else {
          const isOnAuthRoute =
            topSegment === 'login' || topSegment === 'signup' || topSegment === '(auth)';
          if (isOnAuthRoute) router.replace('/(tabs)');
        }
      } catch (err) {
        console.warn('Error checking supabase session', err);
      } finally {
        if (isMounted) setChecking(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN') router.replace('/(tabs)');
      if (event === 'SIGNED_OUT') router.replace('/login');
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  if (checking) {
    return (
      <JotaiProvider>
        <QueryProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheetModalProvider>
              <ThemeProvider>
                <SafeAreaProvider>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" />
                  </View>
                </SafeAreaProvider>
              </ThemeProvider>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </QueryProvider>
      </JotaiProvider>
    );
  }

  return (
    <JotaiProvider>
      <QueryProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  {/* Auth group */}
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="login" />
                  <Stack.Screen name="signup" />

                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="notifications"
                    options={{ headerShown: true, title: 'Notifications' }}
                  />
                  <Stack.Screen name="summary" options={{ headerShown: true, title: 'Summary' }} />
                  <Stack.Screen name="group" options={{ headerShown: true, title: 'Group' }} />
                </Stack>
              </SafeAreaProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </QueryProvider>
    </JotaiProvider>
  );
}
