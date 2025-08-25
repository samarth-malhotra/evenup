// app/_layout.tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { useColorScheme } from "react-native";
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
          <Stack.Screen name="group" options={{ headerShown: true, title: "Group" }} />
          <Stack.Screen
            name="modals"
            options={{ presentation: "modal", headerShown: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
