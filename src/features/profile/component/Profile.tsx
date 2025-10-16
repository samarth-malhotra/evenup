// ProfileScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { APP_MODE } from '@/constant';
import { signOut } from '@/features/auth/auth';
import { useUpdateUserProfile } from '@/features/profile/hooks/useUpdateUserProfile';
import { addToastAtom } from '@/stores/atoms/toast';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';

type Currency = 'INR' | 'USD' | 'EUR';

export default function Profile() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  // canonical user provided by root layout
  const user = useAtomValue(userAtom);
  const setToast = useSetAtom(addToastAtom);

  const updateMutation = useUpdateUserProfile();

  // local editable state
  const [nickname, setNickname] = useState<string>(user?.nickname ?? user?.name ?? '');
  const [appTheme, setAppTheme] = useState<APP_MODE | undefined>(user?.theme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currency, setCurrency] = useState<Currency>('INR');

  const [isEditingName, setIsEditingName] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // sync canonical -> local (but avoid stomping while user editing)
  useEffect(() => {
    if (!user) return;
    if (!isEditingName) {
      setNickname(user.nickname ?? user.name ?? '');
    }
    setAppTheme(user.theme ?? APP_MODE.LIGHT);
  }, [user, isEditingName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Profile" showBackButton={false} />,
    });
  }, [navigation]);

  useEffect(() => {
    if (isEditingName && inputRef.current) inputRef.current.focus();
  }, [isEditingName]);

  const startEdit = useCallback(() => setIsEditingName(true), []);

  const onChangeCurrency = useCallback(() => {
    setCurrency((c) => (c === 'INR' ? 'USD' : c === 'USD' ? 'EUR' : 'INR'));
  }, []);

  const onExportData = useCallback(() => {
    setToast({ title: 'Export', message: 'Export not implemented', type: 'info' });
  }, [setToast]);

  /**
   * Centralized update function — always sends both nickname & theme.
   * Ensures a single place for mutation behaviour (toasts, atom update, isSaving).
   */
  const performUpdate = useCallback(
    (payload: { userId: string; nickname: string | null; theme?: APP_MODE }) => {
      if (!payload.userId) {
        setToast({ title: 'Error', message: 'No user id', type: 'error' });
        return;
      }

      setIsSaving(true);
      updateMutation.mutate(
        {
          userId: payload.userId,
          nickname: payload.nickname ?? '',
          theme: payload.theme ?? appTheme,
        },
        {
          onSuccess: () => {
            setToast({ title: 'Saved', message: 'Profile updated', type: 'success' });
            setIsSaving(false);
            setIsEditingName(false);
          },
          onError: (err: any) => {
            console.error('Profile update failed', err?.message ?? err);
            setToast({ title: 'Error', message: err?.message ?? 'Failed to save', type: 'error' });
            setIsSaving(false);
          },
        }
      );
    },
    [updateMutation, appTheme, setToast]
  );

  // handler for name save (pressing check / submit)
  const onSaveName = useCallback(() => {
    if (!user?.id) {
      setToast({ title: 'Error', message: 'No user id', type: 'error' });
      return;
    }

    const trimmed = (nickname ?? '').trim();
    // if nothing changed vs canonical user, just close edit mode
    if (
      trimmed === (user.nickname ?? user.name ?? '').trim() &&
      (appTheme ?? APP_MODE.LIGHT) === (user.theme ?? APP_MODE.LIGHT)
    ) {
      setIsEditingName(false);
      return;
    }

    performUpdate({ userId: user.id, nickname: trimmed || null, theme: appTheme });
  }, [
    user?.id,
    nickname,
    appTheme,
    user?.nickname,
    user?.name,
    user?.theme,
    setToast,
    performUpdate,
  ]);

  // handler for theme toggle — immediately update server with current nickname + new theme
  const handleThemeToggle = useCallback(
    (next?: boolean) => {
      if (!user?.id) {
        setToast({ title: 'Error', message: 'No user id', type: 'error' });
        return;
      }
      const newTheme =
        typeof next === 'boolean'
          ? next
            ? APP_MODE.DARK
            : APP_MODE.LIGHT
          : appTheme === APP_MODE.LIGHT
            ? APP_MODE.DARK
            : APP_MODE.LIGHT;
      // update local UI synchronously
      setAppTheme(newTheme);
      // disable switch while saving via isSaving (Switch will show disabled)
      performUpdate({ userId: user.id, nickname: nickname?.trim() ?? null, theme: newTheme });
    },
    [user?.id, appTheme, nickname, performUpdate, setToast]
  );

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled">
      <View className="flex-1 bg-transparent px-4 py-2">
        <View
          className={`mb-4 rounded-2xl bg-white px-3 py-4 ${Platform.OS === 'ios' ? 'shadow' : 'elevation-2'}`}>
          <View className="mb-2 items-center">
            <Avatar size={100} name={nickname ?? ''} />
          </View>

          <View className="items-center">
            <View className="flex-row items-center">
              {!isEditingName ? (
                <>
                  <Text
                    accessibilityRole="header"
                    className="text-xl text-gray-800"
                    numberOfLines={1}>
                    {nickname}
                  </Text>
                  <TouchableOpacity
                    accessibilityLabel="Edit name"
                    activeOpacity={0.7}
                    onPress={startEdit}
                    className="ml-3 rounded-md bg-violet-50 p-1">
                    <Ionicons name="create-outline" size={18} color="#6C5CE7" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    ref={inputRef}
                    value={nickname}
                    onChangeText={setNickname}
                    className="min-w-40 rounded-md border border-violet-100 px-2 py-1 text-xl text-gray-800"
                    placeholder="Your name"
                    returnKeyType="done"
                    onSubmitEditing={onSaveName}
                    editable={!isSaving}
                    accessibilityLabel="Edit your display name"
                  />

                  <TouchableOpacity
                    onPress={onSaveName}
                    activeOpacity={0.8}
                    className="ml-3 items-center justify-center rounded-full bg-green-600 p-2"
                    disabled={isSaving || !user?.id || nickname?.trim().length === 0}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsEditingName(false)}
                    activeOpacity={0.8}
                    className="ml-2 items-center justify-center rounded-full bg-gray-200 p-2"
                    disabled={isSaving}>
                    <Ionicons name="close" size={18} color="#374151" />
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text className="mt-3 text-sm text-gray-500">{user?.email}</Text>
            {user?.phone ? <Text className="text-sm text-gray-500">{user?.phone}</Text> : null}
          </View>
        </View>

        <Text
          style={{ color: theme.colors.textPrimary }}
          className="mb-2 mt-1 text-xl font-extrabold">
          Preferences
        </Text>
        <View
          className={`mb-4 rounded-2xl bg-white px-3 py-2 ${Platform.OS === 'ios' ? 'shadow' : 'elevation-2'}`}>
          <RowSwitch
            icon="notifications-outline"
            iconTint="#6C5CE7"
            label="Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <Divider />
          <RowValue
            icon="sync-outline"
            iconTint="#6C5CE7"
            label="Currency"
            value={currency === 'INR' ? `₹ ${currency}` : `${currency}`}
            onPress={onChangeCurrency}
          />
          <Divider />
          <RowSwitch
            icon="moon-outline"
            iconTint="#6C5CE7"
            label="Dark Mode"
            value={appTheme === APP_MODE.DARK}
            onValueChange={(v) => handleThemeToggle(v)}
            disabled={isSaving}
          />
        </View>

        <Text
          style={{ color: theme.colors.textPrimary }}
          className="mb-2 mt-1 text-xl font-extrabold">
          Data & Security
        </Text>
        <View
          className={`mb-6 rounded-2xl bg-white px-3 py-2 ${Platform.OS === 'ios' ? 'shadow' : 'elevation-2'}`}>
          <Row
            icon="cloud-download-outline"
            iconTint="#6C5CE7"
            label="Export Data"
            onPress={onExportData}
          />
        </View>

        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          className="mb-4 rounded-full bg-red-600 py-3"
          style={{ alignSelf: 'stretch' }}>
          <Text className="text-center font-medium text-white">Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ----------------------------- Reusable rows ------------------------------ */

function Row({
  icon,
  iconTint = '#6C5CE7',
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-3"
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button">
      <LeadingIcon name={icon} color={iconTint} />
      <Text className="flex-1 text-base font-bold text-gray-900">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function RowSwitch({
  icon,
  iconTint = '#6C5CE7',
  label,
  value,
  onValueChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-center py-3">
      <LeadingIcon name={icon} color={iconTint} />
      <Text className="flex-1 text-base font-bold text-gray-900">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        thumbColor={value ? '#fff' : undefined}
        trackColor={{ false: '#E5E7EB', true: '#6C5CE7' }}
      />
    </View>
  );
}

function RowValue({
  icon,
  iconTint = '#6C5CE7',
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity className="flex-row items-center py-3" activeOpacity={0.7} onPress={onPress}>
      <LeadingIcon name={icon} color={iconTint} />
      <Text className="flex-1 text-base font-bold text-gray-900">{label}</Text>
      <Text className="mr-2 text-sm font-semibold text-gray-500">{value}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function LeadingIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View className="mr-3 h-8 w-8 items-center justify-center rounded-md bg-violet-50">
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-violet-50" />;
}
