// app/groups/new.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useCreateGroup } from '@/api/calls/groups';
import { Avatar } from '@/components/Avatar';
import BottomSheet from '@/components/BottomSheet';
import { getBoxShadow } from '@/hooks/getBoxShadow';
import { useColor } from '@/hooks/useColor';
import { useTheme } from '@/hooks/useTheme';
import { userAtom } from '@/stores/atoms/user';
import { makeClientTempId } from '@/utils/uid';
import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useAtomValue } from 'jotai';

type Props = {
  open: boolean;
  onClose: () => void;
  // onCreate?: (payload: { name: string; image: string | null; members: string[] }) => void;
};

export default function NewGroupSheet({ open, onClose }: Props) {
  const { theme } = useTheme();
  const getColor = useColor();
  const createGroup = useCreateGroup();
  const user = useAtomValue(userAtom);
  const sheetRef = useRef<BottomSheetModalType>(null);

  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  // Always include creator ("You") as default
  const [members, setMembers] = useState<string[]>(['You', 'Anita', 'Rohit']);

  // present / dismiss with the prop
  useEffect(() => {
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  const handleCreate = () => {
    const payload = { name: name.trim(), image, members };
    onCreate?.(payload);
    onClose();
  };

  const removeMember = (member: string) => {
    if (member === 'You') return; // cannot remove creator
    setMembers((prev) => prev.filter((m) => m !== member));
  };

  const onCreate = async (payload: { name: string; image: string | null; members: string[] }) => {
    const clientTempId = makeClientTempId('group');

    const clientPayload = {
      name: payload.name,
      description: null,
      created_by: user?.id ?? 'unknown-user',
      __clientTempId: clientTempId,
      // do NOT include image/members if your DB doesn't accept them. Add them to server payload if DB supports.
    };

    try {
      // This will:
      // - optimistically add item with id = clientTempId
      // - call the server (createGroupServer) with server-facing fields
      // - on success: replace the optimistic item by matching __clientTempId
      const serverGroup = await createGroup.mutateAsync(clientPayload);
      // serverGroup.id exists — you can navigate to it:
      console.log('created group', serverGroup.id);
    } catch (err) {
      console.error('Create group failed', err);
      // your UI show toast etc
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Title */}
      <Text
        style={{ color: theme.colors.textPrimary }}
        className="mb-3 text-center text-lg font-semibold">
        Create Group
      </Text>

      {/* Group Info */}
      <View
        style={[{ backgroundColor: theme.colors.background }, getBoxShadow('sm')]}
        className="mb-5 rounded-2xl p-5">
        {/* Group Avatar */}
        <Pressable
          onPress={() => console.log('TODO: open image picker')}
          className="mb-4 self-center">
          <Avatar
            name={'Photo'}
            theme={theme}
            size={81}
            imageUri={image ?? ''}
            icon={<MaterialIcons name="group" size={32} color={getColor('textSecondary')} />}
          />
          <Text style={{ color: theme.colors.link }} className="mt-2 text-center text-sm">
            {image ? 'Change Image' : 'Add Image'}
          </Text>
        </Pressable>

        {/* Group Name */}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name (e.g. Goa Trip)"
          placeholderTextColor={getColor('placeholder')}
          style={{ backgroundColor: theme.colors.inputBackground, color: theme.colors.textPrimary }}
          className="rounded-xl px-4 py-3 text-base"
          returnKeyType="done"
        />
      </View>

      {/* Members */}
      <View style={[{ backgroundColor: theme.colors.background }]} className="mb-5 rounded-2xl p-5">
        <Text
          style={{ color: theme.colors.textSecondary }}
          className="mb-4 text-base font-semibold">
          Members
        </Text>

        <Pressable
          onPress={() => console.log('TODO: open members picker')}
          style={{ backgroundColor: theme.colors.inputBackground }}
          className="flex-row items-center justify-between rounded-xl px-4 py-3">
          <Text style={{ color: theme.colors.textPrimary }}>Add members</Text>
          <MaterialIcons name="person-add" size={22} color={getColor('textSecondary')} />
        </Pressable>

        {/* Selected Members Chips */}
        {members.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {members.map((m) => (
              <View
                key={m}
                style={[{ backgroundColor: theme.colors.disabled }]}
                className="flex-row items-center rounded-full px-3 py-1.5">
                <Text
                  style={[{ color: theme.colors.textSecondary }]}
                  className={`${m !== 'You' ? 'mr-2' : ''} text-sm font-medium`}>
                  {m}
                </Text>
                {m !== 'You' && (
                  <Pressable onPress={() => removeMember(m)} hitSlop={10}>
                    <MaterialIcons name="close" size={16} color={getColor('textSecondary')} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Create Button */}
      <TouchableOpacity
        onPress={handleCreate}
        style={[{ backgroundColor: theme.colors.link }, getBoxShadow('lg')]}
        className="rounded-full py-4">
        <Text
          style={[{ color: theme.colors.textWhite }]}
          className="text-center text-lg font-semibold">
          Create Group
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}
