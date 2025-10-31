// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as JotaiProvider, useAtom, useSetAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryProvider } from '@/components/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import ToastProvider from '@/components/ToastProvider';
import type { APP_MODE } from '@/constant';
import { initAuth } from '@/features/auth/auth';
import { useUserProfile } from '@/features/profile/hooks/useUserProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { addToastAtom } from '@/stores/atoms/toast';
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
                <ToastProvider />
              </SafeAreaProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </JotaiProvider>
    </QueryProvider>
  );
}

function InnerApp() {
  const { setMode } = useTheme();
  const [user, setUser] = useAtom(userAtom);
  const addToast = useSetAtom(addToastAtom);

  const userId: string = useMemo(() => user?.id ?? '', [user]);
  const { data: userProfile, isFetching, isLoading, isError, error } = useUserProfile(userId);
  // this will make entry in the db of users device info
  usePushNotifications(user?.id ?? null);

  useEffect(() => {
    if (isLoading) return;
    if (userProfile) {
      setUser(userProfile);
      setMode(userProfile?.theme as APP_MODE);
    }
    // console.log('in main layout page setting theme: ', userProfile?.theme);
  }, [isLoading, setMode, setUser, userProfile]);

  useEffect(() => {
    if (isError && error) {
      const msg = error.message ?? 'Failed to load user profile';
      addToast({ title: 'Error', message: msg, type: 'error' });
    }
  }, [isError, error, addToast]);

  if (isFetching) {
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
