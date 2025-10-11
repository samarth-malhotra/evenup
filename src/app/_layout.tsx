// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as JotaiProvider, useAtom, useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryProvider } from '@/components/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import ToastProvider from '@/components/ToastProvider';
import { initAuth } from '@/features/auth/auth';
import { fetchUserProfile } from '@/services/hooks/userProfile';
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
  const isLoading = useAtomValue(authLoadingAtom);
  const [user, setUser] = useAtom(userAtom);
  // const { setMode } = useTheme();

  const userId: string = useMemo(() => user?.id ?? '', [user]);

  // const { data: profile, isLoading: isUserLoading, error } = useUserProfileById(user?.id ?? '');
  useEffect(() => {
    async function profile(userId: string) {
      const result = await fetchUserProfile(userId);

      // console.log('user inn: ', user?.name, user?.nickname, result?.nickname);
      if (result) {
        setUser((prev) => ({ ...prev, nickname: result?.nickname }));
      }

      // setMode(result?.theme as APP_MODE);
    }
    if (userId) {
      profile(userId);
    }
  }, [setUser, userId]);

  if (isLoading) {
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
