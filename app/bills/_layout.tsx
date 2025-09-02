// app/bills/_layout.tsx
import { Stack } from "expo-router";

export default function BillScreens() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="addBill" options={{ title: "Add Bill" }} />
      <Stack.Screen name="editBill" options={{ title: "Edit Bill" }} />
    </Stack>
  );
}
