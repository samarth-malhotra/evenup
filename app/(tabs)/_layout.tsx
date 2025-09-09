// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { darkTheme, lightTheme } from '@/theme/paper';

export const unstable_settings = { initialRouteName: '(auth)' };

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

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

          if (!isOnAuthRoute) {
            router.replace('/login');
          }
        } else {
          const isOnAuthRoute =
            topSegment === 'login' || topSegment === 'signup' || topSegment === '(auth)';

          if (isOnAuthRoute) {
            // ✅ send signed-in users directly to Home
            router.replace('/(tabs)/home');
          }
        }
      } catch (err) {
        console.warn('Error checking supabase session', err);
      } finally {
        if (isMounted) setChecking(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.replace('/(tabs)/home');
      }
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  if (checking) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
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
              {/* Auth group */}
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="login" />
              <Stack.Screen name="signup" />

              {/* Tabs group */}
              <Stack.Screen name="(tabs)" />

              {/* Non-tab sections */}
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
