// app/_layout.tsx
import { QueryProvider } from '@/api/helper/queryClient';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { Provider as JotaiProvider } from 'jotai';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return (
    <JotaiProvider>
      <QueryProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false }}>
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
