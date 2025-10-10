// app/groups/new.tsx
import { MaterialIcons } from '@expo/vector-icons';
import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import BottomSheet from '@/components/BottomSheet';
import { useAccessToken } from '@/hooks/useAccessToken';
import { supabase } from '@/services/supabase';
import { groupsAtom } from '@/stores/atoms/groups';
import { userAtom } from '@/stores/atoms/user';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';
import { makeClientTempId } from '@/utils/uid';

type Props = {
  open: boolean;
  onClose: () => void;
};

type CreateGroupRequestType = {
  name: string;
  avatar_url: string | null;
};

type CreateGroupResponseType = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
  deleted_at?: string;
  deleted_by?: string;
  reverted_by?: string;
  simplified: boolean;
  status: 'active' | 'deleted';
  updated_at: string;
};

const BUCKET_NAME = 'group-avatars'; // make sure exists
const CREATE_GROUP_ENDPOINT = 'https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/create-group'; // adjust to your deployed URL

export default function NewGroupSheet({ open, onClose }: Props) {
  const { theme } = useTheme();
  const getColor = useColor();
  const user = useAtomValue(userAtom);
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModalType>(null);
  const setGroups = useSetAtom(groupsAtom);
  const { accessToken: token } = useAccessToken();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to pick an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if ('canceled' in result && result.canceled) return;
      const pickedUri =
        Array.isArray(result.assets) && result.assets.length > 0 ? result.assets[0].uri : null;
      if (pickedUri) setImageUri(pickedUri);
    } catch (err) {
      console.error('pickImage error:', err);
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const uploadImageToStorage = async (uri: string, userId: string) => {
    try {
      const ext =
        uri
          .split('.')
          .pop()
          ?.split(/\\#|\?/)[0] ?? 'jpg';
      const fileName = `avatars/${userId}/${Date.now()}-${makeClientTempId()}.${ext}`;
      const resp = await fetch(uri);
      const blob = await resp.blob();

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      return data.publicUrl ?? null;
    } catch (err) {
      console.error('uploadImageToStorage error:', err);
      throw err;
    }
  };

  const callCreateGroupEdge = async (
    payload: CreateGroupRequestType
  ): Promise<CreateGroupResponseType> => {
    if (!token) throw new Error('No access token. Please login again.');
    const res = await fetch(CREATE_GROUP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Create-group edge returned ${res.status}: ${text}`);
    }

    const json = await res.json();
    return json;
  };

  // ---------- React Query mutation with immediate navigation ----------
  const makeTempGroup = (groupName: string, userId: string) => {
    const tempId = makeClientTempId();
    const now = new Date().toISOString();
    return {
      id: tempId,
      group_name: groupName,
      avatar_url: null,
      created_at: now,
      created_by: userId,
      updated_at: now,
      simplified: false,
      status: 'active',
      members: [],
      // keep owner info helpful for UI
      owner: { id: userId, name: user?.nickname ?? '', phone_hash: '', email_hash: '' },
      // mark optimistic
      __optimistic: true,
    } as any;
  };

  const createGroupMutation = useMutation({
    mutationFn: (payload: CreateGroupRequestType) => callCreateGroupEdge(payload),
    onMutate: async (payload) => {
      // Cancel any outgoing refetches for groups
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const previousGroups = queryClient.getQueryData<any[]>(['groups']);

      // optimistic group for immediate UI
      const temp = makeTempGroup(payload.name, user?.id ?? 'unknown');

      // set optimistic cache in react-query
      queryClient.setQueryData(['groups'], (old: any[] | undefined) =>
        old ? [temp, ...old] : [temp]
      );

      // also update jotai store immediately
      setGroups((prev) => [temp, ...prev]);

      // immediately navigate to the detail page for the temp group and close sheet
      // add a query param `optimistic=true` so detail screen can show a loading state if desired
      router.push(`/(tabs)/groups/${temp.id}?isNewgroup=true&optimistic=true`);

      // close the bottom sheet UI
      onClose();

      return { previousGroups, tempId: temp.id };
    },
    onError: (err: any, variables, context: any) => {
      // rollback react-query cache
      if (context?.previousGroups) {
        queryClient.setQueryData(['groups'], context.previousGroups);
      }
      // rollback jotai store
      if (context?.tempId) {
        setGroups((prev) => prev.filter((g) => g.id !== context.tempId));
      }

      console.error('create group mutation failed', err);
      // If user is currently on the optimistic detail page, navigate back to groups list
      try {
        // if current path contains the tempId, we go back to main groups list
        // safe guard: only perform replace if router path includes tempId
        const currentPath = (router as any).pathname ?? '';
        if (currentPath.includes(context?.tempId)) {
          router.replace('/(tabs)/groups'); // adjust if your groups list route differs
        }
      } catch (e) {
        // ignore routing errors
      }

      Alert.alert('Error', err?.message ?? 'Failed to create group');
    },
    onSuccess: (createdGroup, variables, context: any) => {
      // Replace the optimistic item in react-query cache with the real server data
      queryClient.setQueryData(['groups'], (old: any[] | undefined) =>
        old ? old.map((g) => (g.id === context.tempId ? createdGroup : g)) : [createdGroup]
      );

      // Also update jotai: replace temp entry with server entry
      setGroups((prev) => {
        const withoutTemp = prev.filter((g) => g.id !== context.tempId);
        const mapped = {
          id: createdGroup.id,
          group_name: createdGroup.name,
          avatar_url: createdGroup.avatar_url,
          created_at: createdGroup.created_at,
          created_by: createdGroup.created_by,
          updated_at: createdGroup.updated_at,
          simplified: createdGroup.simplified,
          status: createdGroup.status,
          members: [], // detail page will fetch members / details separately
          owner: { id: user?.id ?? '', name: user?.nickname ?? '', phone_hash: '', email_hash: '' },
        };
        return [mapped, ...withoutTemp];
      });

      // Replace the optimistic route with the real id so URL/back behavior is correct
      try {
        // If the current route has the temp id, replace it. Otherwise, just ensure the real page is reachable.
        const currentPath = (router as any).pathname ?? '';
        if (currentPath.includes(context?.tempId)) {
          router.replace(`/(tabs)/groups/${createdGroup.id}?isNewgroup=true`);
        } else {
          // If user navigated away, we still may want to prefetch details
          // optional: prefetch group detail with a groups/[id] query if you have one
        }
      } catch (e) {
        // ignore routing errors
      }

      // ensure canonical refetch (optional)
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onSettled: () => {
      // final cleanup — ensure the groups query is fresh
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const isMutating = createGroupMutation.isPending;

  // ---------- handler that uploads image (if present) then triggers mutation ----------
  const handleCreate = async () => {
    if (!name || name.trim().length === 0) {
      Alert.alert('Validation', 'Group name is required.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Authentication', 'User not found. Please login again.');
      return;
    }

    // Upload image first (keeps mutationFn stable & small).
    let avatar_url: string | null = null;
    if (imageUri) {
      try {
        setUploadingImage(true);
        avatar_url = await uploadImageToStorage(imageUri, user.id);
      } catch (uploadErr) {
        console.warn('avatar upload failed, creating group without avatar', uploadErr);
        avatar_url = null;
        // We purposely continue — group creation without avatar is allowed.
      } finally {
        setUploadingImage(false);
      }
    }

    // trigger mutation (optimistic update is handled in onMutate)
    try {
      createGroupMutation.mutate({ name: name.trim(), avatar_url });
      // clear name & image optimistically
      setName('');
      setImageUri(null);
    } catch (err) {
      console.error('mutation trigger failed', err);
      Alert.alert('Error', (err as Error).message ?? 'Could not create group');
    }
  };

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
        <Pressable onPress={pickImage} className="mb-4 self-center">
          <Avatar
            name={'Photo'}
            theme={theme}
            size={81}
            imageUri={imageUri ?? ''}
            icon={<MaterialIcons name="group" size={32} color={getColor('textSecondary')} />}
          />
          <Text style={{ color: theme.colors.link }} className="mt-2 text-center text-sm">
            {imageUri ? 'Change Image' : 'Add Image'}
          </Text>
        </Pressable>

        {imageUri ? (
          <View className="mb-3 items-center">
            <Image
              source={{ uri: imageUri }}
              style={{ width: 120, height: 120, borderRadius: 12 }}
            />
          </View>
        ) : null}

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

      <TouchableOpacity
        onPress={handleCreate}
        style={[{ backgroundColor: theme.colors.link }, getBoxShadow('lg')]}
        className="rounded-full py-4"
        disabled={isMutating || uploadingImage}>
        {isMutating || uploadingImage ? (
          <ActivityIndicator color={theme.colors.textWhite} />
        ) : (
          <Text
            style={[{ color: theme.colors.textWhite }]}
            className="text-center text-lg font-semibold">
            Create Group
          </Text>
        )}
      </TouchableOpacity>
    </BottomSheet>
  );
}
