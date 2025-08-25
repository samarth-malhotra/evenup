// app/profile/index.tsx
import { View, Text, Button } from "react-native";
import { Link } from "expo-router";

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text>Profile</Text>
      <Link href="/profile/edit" asChild>
        <Button title="Edit Profile" />
      </Link>
    </View>
  );
}
