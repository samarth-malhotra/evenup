import { useState } from "react";
import { View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

export default function AddBill() {
  const [name, setName] = useState("");
  const [members, setMembers] = useState("You, Alice, Bob");

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text variant="bodyMedium">Bills yet. Create your first one below.</Text>

      <Text variant="titleMedium" style={{ marginTop: 8 }}>
        Create Bill
      </Text>
      <TextInput
        mode="outlined"
        placeholder="Bill name (e.g., Dinner)"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        mode="outlined"
        placeholder="Comma-separated members"
        value={members}
        onChangeText={setMembers}
      />
      <Button mode="contained">Create</Button>
    </View>
  );
}
