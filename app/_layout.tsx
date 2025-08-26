// app/_layout.tsx
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { lightTheme, darkTheme } from "../theme/paper";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* The Tabs group */}
          <Stack.Screen name="(tabs)" />

          {/* Non-tab sections still work via push/link */}
          <Stack.Screen
            name="notifications/index"
            options={{
              headerShown: true,
              title: "Notifications",
            }}
          />
          <Stack.Screen
            name="addBills/index"
            options={{
              headerShown: true,
              title: "Add Bills",
            }}
          />
          <Stack.Screen
            name="summary/index"
            options={{
              headerShown: true,
              title: "Summary",
            }}
          />
          <Stack.Screen
            name="group"
            options={{ headerShown: true, title: "Group" }}
          />
          
        </Stack>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
