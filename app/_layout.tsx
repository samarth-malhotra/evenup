// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme/ThemeProvider';
import '../global.css';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        {/* your stacks/tabs here */}
        <ThemeProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
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
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
