// app/_layout.tsx
import { QueryProvider } from '@/api/helper/queryClient';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider, useAuth } from '@/features/auth/components/AuthProvider';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* public/auth routes (file-based: placed under app/(auth) folder) */}
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/signup" />

      {/* app */}
      <Stack.Screen name="(tabs)" />

      {/* other screens */}
      <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="summary" options={{ headerShown: true, title: 'Summary' }} />
      {/* <Stack.Screen name="group" options={{ headerShown: true, title: 'Group' }} /> */}
    </Stack>
  );
}
