// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import '../global.css';

import { darkTheme, lightTheme } from '../theme/paper';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  const router = useRouter();
  const segments = useSegments(); // expo-router hook to inspect current route segments
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // check session once on mount
    (async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // first segment often indicates top-level group or route: e.g. '(tabs)' or 'login'
        const topSegment = segments[0] ?? '';

        // if no session and not already on an auth route, redirect to /login
        if (!session) {
          const isOnAuthRoute =
            topSegment === 'login' || topSegment === 'signup' || topSegment === '(auth)';

          if (!isOnAuthRoute) {
            router.replace('/login');
          }
        } else {
          // session exists: if user is on auth pages, send them to tabs
          const isOnAuthRoute =
            topSegment === 'login' || topSegment === 'signup' || topSegment === '(auth)';

          if (isOnAuthRoute) {
            router.replace('/(tabs)');
          }
        }
      } catch (err) {
        console.warn('Error checking supabase session', err);
      } finally {
        if (isMounted) setChecking(false);
      }
    })();

    // subscribe to auth changes (sign in / sign out)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // on sign in -> navigate to tabs
      if (event === 'SIGNED_IN') {
        router.replace('/(tabs)');
      }
      // on sign out -> navigate to login
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []); // run once on mount

  // while checking session, show a lightweight loader to avoid UI flash
  if (checking) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" />
              </View>
            </SafeAreaProvider>
          </PaperProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
              {/* Auth group (place your auth screens in app/(auth)/login.tsx and app/(auth)/signup.tsx) */}
              <Stack.Screen name="(auth)" />

              {/* Individual auth routes */}
              <Stack.Screen name="login" />
              <Stack.Screen name="signup" />

              {/* The Tabs group */}
              <Stack.Screen name="(tabs)" />

              {/* Non-tab sections still work via push/link */}
              <Stack.Screen
                name="notifications"
                options={{
                  headerShown: true,
                  title: 'Notifications',
                }}
              />
              <Stack.Screen
                name="summary/index"
                options={{
                  headerShown: true,
                  title: 'Summary',
                }}
              />
              <Stack.Screen name="group" options={{ headerShown: true, title: 'Group' }} />
            </Stack>
          </SafeAreaProvider>
        </PaperProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
