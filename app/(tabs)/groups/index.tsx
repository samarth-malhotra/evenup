import { useState } from "react";
import { View } from "react-native";
import { Appbar, Avatar, Button, Text, TextInput } from "react-native-paper";

export default function GroupsScreen() {
  const [name, setName] = useState("");
  const [members, setMembers] = useState("You, Alice, Bob");

  return (
    <View style={{}}>
      <Appbar.Header>
        <Appbar.Content
          title="Evenup"
          subtitle="Split your bills, not friendship"
        />
        <Appbar.Action icon="magnify" onPress={() => {}} />
        <Avatar.Icon size={24} icon="folder" />
      </Appbar.Header>

      <View style={{ padding: 16, gap: 12 }}>
        <Text variant="bodyMedium">
          No groups yet. Create your first one below.
        </Text>

        <Text variant="titleMedium" style={{ marginTop: 8 }}>
          Create Group
        </Text>
        <TextInput
          mode="outlined"
          placeholder="Group name (e.g., Goa Trip)"
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
    </View>
  );
}
