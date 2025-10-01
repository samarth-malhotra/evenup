// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as JotaiProvider, useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/components/ThemeProvider';
import type { APP_MODE } from '@/constant';
import { initAuth } from '@/features/auth/auth';
import { useUserProfileById } from '@/services/hooks/userProfile';
import { QueryProvider } from '@/services/QueryProvider';
import { authLoadingAtom } from '@/stores/atoms/auth';
import { userAtom } from '@/stores/atoms/user';
import { jotaiStore } from '@/stores/store';
import { useTheme } from '@/theme/hooks/useTheme';
import '../../global.css';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  useEffect(() => {
    initAuth(); // set up listeners once
  }, []);

  return (
    <QueryProvider>
      <JotaiProvider store={jotaiStore}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <InnerApp />
              </SafeAreaProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </JotaiProvider>
    </QueryProvider>
  );
}

function InnerApp() {
  const isLoading = useAtomValue(authLoadingAtom);
  const [user, setUser] = useAtom(userAtom);
  const { setMode } = useTheme();

  const { data: profile, isLoading: isUserLoading, error } = useUserProfileById(user?.id ?? '');
  useEffect(() => {
    if (profile) {
      setUser(profile);
      setMode(profile.theme as APP_MODE);
    }
  }, [profile]);

  if (isLoading || isUserLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AppWithStatusBar />;
}

/** Separate component so we can use useSafeAreaInsets() (must be under SafeAreaProvider) */
function AppWithStatusBar() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const statusBarBackground = theme.colors.primary.DEFAULT;

  return (
    <>
      <StatusBar style="light" translucent />
      <View style={{ height: insets.top, backgroundColor: statusBarBackground }} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: true, title: 'Notifications' }}
        />
        <Stack.Screen name="summary" options={{ headerShown: true, title: 'Summary' }} />
      </Stack>
    </>
  );
}
