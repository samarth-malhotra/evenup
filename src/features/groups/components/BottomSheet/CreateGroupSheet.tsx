// src/components/CreateGroupBottomSheet.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import BottomSheet from '@/components/BottomSheet';
import { MIN_GROUP_NAME_LENGTH } from '@/constant';
import useCreateGroupMutation from '@/features/groups/hooks/useCreateGroupMutation';
import { userAtom } from '@/stores/atoms/user';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';

export default function CreateGroupBottomSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const getColor = useColor();
  const [name, setName] = useState('');
  const user = useAtomValue(userAtom);
  const { createGroup, isCreating } = useCreateGroupMutation();

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a group name.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'User Id is missing.');
      return;
    }

    try {
      createGroup({
        name: trimmed,
        userId: user?.id,
      });
      // close sheet after starting mutation (we have already navigated to temp)
      onClose();
      setName('');
    } catch (e) {
      // error handled in onError, but keep UI safe
      // keep sheet open so user can retry
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Text
        style={{ color: theme.colors.textPrimary }}
        className="mb-3 text-center text-lg font-semibold">
        Create Group
      </Text>

      <View
        style={[{ backgroundColor: theme.colors.background }, getBoxShadow('sm')]}
        className="mb-5 rounded-2xl p-5">
        <Pressable onPress={() => {}} className="mb-4 self-center">
          <Avatar
            name={'Photo'}
            size={81}
            imageUri={''}
            icon={<MaterialIcons name="group" size={32} color={getColor('textSecondary')} />}
          />
          <Text style={{ color: theme.colors.link }} className="mt-2 text-center text-sm">
            'Add Image'
          </Text>
        </Pressable>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name (e.g. Goa Trip)"
          placeholderTextColor={getColor('placeholder')}
          style={{ backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary }}
          className="rounded-xl px-4 py-3 text-base"
          returnKeyType="done"
          editable={!isCreating}
        />
      </View>

      <TouchableOpacity
        onPress={handleCreate}
        disabled={isCreating || name.trim().length < MIN_GROUP_NAME_LENGTH}
        className={`items-center justify-center rounded-md py-3 ${
          isCreating || name.trim().length < MIN_GROUP_NAME_LENGTH ? 'bg-black-600' : 'bg-blue-600'
        }`}>
        {isCreating ? (
          <ActivityIndicator />
        ) : (
          <Text
            className={`font-medium ${
              isCreating || name.trim().length < MIN_GROUP_NAME_LENGTH
                ? 'bg-gray-600'
                : 'text-white'
            } `}>
            Create group
          </Text>
        )}
      </TouchableOpacity>
    </BottomSheet>
  );
}
