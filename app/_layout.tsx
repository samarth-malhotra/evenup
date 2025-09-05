// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';
import { darkTheme, lightTheme } from '../theme/paper';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        {/* your stacks/tabs here */}
        <PaperProvider theme={theme}>
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
        </PaperProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
