// app/groups/new.tsx
import { MaterialIcons } from '@expo/vector-icons';
import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAtomValue } from 'jotai';
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
import { v4 as uuidv4 } from 'uuid';

import { Avatar } from '@/components/Avatar';
import BottomSheet from '@/components/BottomSheet';
import { supabase } from '@/services/supabase';
import { userAtom } from '@/stores/atoms/user';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';

type Props = {
  open: boolean;
  onClose: () => void;
};

const BUCKET_NAME = 'group-avatars'; // make sure exists
const CREATE_GROUP_ENDPOINT = 'https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/create-group'; // adjust to your deployed URL

export default function NewGroupSheet({ open, onClose }: Props) {
  const { theme } = useTheme();
  const getColor = useColor();
  const user = useAtomValue(userAtom);
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModalType>(null);

  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const fileName = `avatars/${userId}/${Date.now()}-${uuidv4()}.${ext}`;
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

  /**
   * getAccessToken
   * Uses supabase client to read current session and return access_token.
   */
  const getAccessToken = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.warn('supabase.auth.getSession error:', error);
        return null;
      }
      console.log('session: ', session?.user.email);
      return session?.access_token ?? null;
    } catch (err) {
      console.warn('getAccessToken error:', err);
      return null;
    }
  };

  const callCreateGroupEdge = async (payload: { name: string; avatar_url?: string | null }) => {
    const token = await getAccessToken();
    if (!token) throw new Error('No access token. Please login again.');
    console.log('payload: ', payload);

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

  const handleCreate = async () => {
    if (!name || name.trim().length === 0) {
      Alert.alert('Validation', 'Group name is required.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Authentication', 'User not found. Please login again.');
      return;
    }

    setSubmitting(true);
    try {
      // const __clientTempId = makeClientTempId('group');

      // upload avatar first (optional)
      let avatar_url: string | null = null;
      if (imageUri) {
        try {
          avatar_url = await uploadImageToStorage(imageUri, user.id);
        } catch (uploadErr) {
          console.warn('avatar upload failed, creating group without avatar', uploadErr);
          avatar_url = null;
        }
      }

      // call edge function to create group
      const payload = {
        name: name.trim(),
        avatar_url,
      };

      const result = await callCreateGroupEdge(payload);
      // result.group expected from edge function
      const createdGroup = result?.group;
      if (!createdGroup?.id) {
        throw new Error('No group returned from server');
      }
      // Clear Name field
      setName('');
      // navigate to add-members screen for this group
      // Adjust this route as per your routing scheme:
      router.push(`/(tabs)/groups/${createdGroup.id}?isNewgroup=true`);
      // `/(tabs)/groups/${item.id}`

      // close sheet
      onClose();
    } catch (err: any) {
      console.error('create group failed', err);
      Alert.alert('Error', err?.message ?? 'Could not create group');
    } finally {
      setSubmitting(false);
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

      {/* members removed here */}

      <TouchableOpacity
        onPress={handleCreate}
        style={[{ backgroundColor: theme.colors.link }, getBoxShadow('lg')]}
        className="rounded-full py-4"
        disabled={submitting}>
        {submitting ? (
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
