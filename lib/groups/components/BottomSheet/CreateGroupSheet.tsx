// app/groups/new.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import BottomSheet from '@/lib/shared/components/BottomSheet';

import { getBoxShadow } from '@/hooks/getBoxShadow';
import { Avatar } from '@/lib/shared/components/Avatar';
import { useColor } from '@/lib/shared/utils/color';
import { useTheme } from '@/theme/ThemeProvider';
import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: { name: string; image: string | null; members: string[] }) => void;
};

export default function NewGroupSheet({ open, onClose, onCreate }: Props) {
  const { theme } = useTheme();
  const getColor = useColor();
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
          placeholderTextColor={getColor('textSecondary')}
          style={{ backgroundColor: theme.colors.mutedLight, color: theme.colors.textPrimary }}
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
          style={{ backgroundColor: theme.colors.mutedLight }}
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
                style={[{ borderColor: theme.colors.muted }]}
                className="flex-row items-center rounded-full border-2 px-3 py-1.5">
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
