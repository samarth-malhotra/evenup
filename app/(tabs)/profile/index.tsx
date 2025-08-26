// app/profile/index.tsx
import { Link } from "expo-router";
import { View, Text, Button } from "react-native";

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
