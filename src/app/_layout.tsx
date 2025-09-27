// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as JotaiProvider } from 'jotai';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryProvider } from '@/api/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider, useAuth } from '@/features/auth/components/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import '../../global.css';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return (
    <JotaiProvider>
      <QueryProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <AuthProvider>
                  <InnerApp />
                </AuthProvider>
              </SafeAreaProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </QueryProvider>
    </JotaiProvider>
  );
}

function InnerApp() {
  const { isLoading } = useAuth();

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
