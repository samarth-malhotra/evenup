// ProfileScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
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
import { fetchUserProfile, updateUserProfileById } from '@/services/hooks/userProfile';
import { addToastAtom } from '@/stores/atoms/toast';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';

type Currency = 'INR' | 'USD' | 'EUR';

export default function Profile() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [localUser, setLocalUser] = useAtom(userAtom); // minimal/full user for sync reads
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // keep local dark-mode boolean in state (initialised from user store)
  const [darkModeEnabled, setDarkModeEnabled] = useState(localUser?.theme === APP_MODE.DARK);

  // keep darkModeEnabled in sync if localUser.theme changes externally
  useEffect(() => {
    setDarkModeEnabled(localUser?.theme === APP_MODE.DARK);
  }, [localUser?.theme]);

  const [currency, setCurrency] = useState<Currency>('INR');
  console.log('localUser: ', localUser?.nickname, localUser?.theme, darkModeEnabled);
  // Inline edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(localUser?.nickname ?? localUser?.name ?? '');
  const inputRef = useRef<TextInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useSetAtom(addToastAtom);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Profilee" showBackButton={false} />,
    });
  }, [navigation]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const userId = useMemo(() => localUser?.id ?? '', [localUser?.id]);

  const startEdit = useCallback(() => {
    setEditName(localUser?.nickname ?? localUser?.name ?? '');
    setIsEditingName(true);
  }, [localUser?.name, localUser?.nickname]);

  const cancelEdit = useCallback(() => {
    if (isSaving) return; // avoid cancelling while saving
    setEditName(localUser?.nickname ?? localUser?.name ?? '');
    setIsEditingName(false);
  }, [isSaving, localUser?.name, localUser?.nickname]);

  const onChangeCurrency = useCallback(() => {
    setCurrency((c) => (c === 'INR' ? 'USD' : c === 'USD' ? 'EUR' : 'INR'));
  }, []);

  const onExportData = useCallback(() => {
    // placeholder for export flow
  }, []);

  // Save handler
  const onSave = useCallback(async () => {
    // Prevent saving if already saving, no userId, or nothing changed
    if (isSaving) return;
    if (!userId) {
      console.warn('No user id available to save profile');
      return;
    }
    if (
      editName === (localUser?.nickname ?? localUser?.name ?? '') &&
      darkModeEnabled === (localUser?.theme === APP_MODE.DARK)
    ) {
      // nothing changed
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);

    // Optimistically update local UI (so the UI reflects user's intent immediately)
    const prev = localUser;
    setLocalUser((p) => ({
      ...(p ?? {}),
      nickname: editName.trim(),
      theme: darkModeEnabled ? APP_MODE.DARK : APP_MODE.LIGHT,
    }));

    const payload = {
      userId,
      nickname: editName.trim(),
      theme: darkModeEnabled ? APP_MODE.DARK : APP_MODE.LIGHT,
    };

    try {
      const updated = await updateUserProfileById(payload);

      if (!updated) {
        // server didn't return a row — treat as failure
        throw new Error('No row returned — update may not have applied');
      }
      addToast({ title: 'Saved', message: 'Profile updated', type: 'success' });

      // Persist canonical server data into local store
      setLocalUser((p) => ({ ...(p ?? {}), nickname: updated.nickname, theme: updated.theme }));
    } catch (err: any) {
      // rollback optimistic update
      setLocalUser(prev ?? null);
      console.error('Profile update failed', err?.message ?? err);
      addToast({ title: 'Error', message: 'Failed to save', type: 'error', duration: 5000 });
    } finally {
      setIsSaving(false);
      setIsEditingName(false);
    }
  }, [isSaving, userId, editName, localUser, darkModeEnabled, setLocalUser, addToast]);

  /**
   * Toggle theme handler
   *
   * Accepts the new boolean (from the Switch) OR toggles when called without param.
   * Computes newTheme deterministically so we never read a stale `darkModeEnabled` value.
   */
  const onToggleTheme = useCallback(
    (next?: boolean) => {
      // determine new boolean value
      // const newDark = typeof next === 'boolean' ? next : !darkModeEnabled;
      // const newTheme = newDark ? APP_MODE.DARK : APP_MODE.LIGHT;

      // call the actual theme toggler (so app-level theme changes immediately)
      // toggleTheme();

      // update local switch state
      setDarkModeEnabled((prev) => !prev);
      // setResolvedTheme((prev) => (prev === APP_MODE.DARK ? APP_MODE.DARK : APP_MODE.LIGHT));

      // optimistically update localUser theme so other screens observe the change
      setLocalUser((p) => ({
        ...(p ?? {}),
        theme: p?.theme === APP_MODE.DARK ? APP_MODE.DARK : APP_MODE.LIGHT,
      }));
    },
    [setLocalUser]
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    // guard against accidental double refresh
    if (refreshing) return;
    if (!userId) {
      console.warn('onRefresh called but no userId available');
      addToast({ title: 'Refresh failed', message: 'No user id available', type: 'error' });
      return;
    }

    setRefreshing(true);
    console.log('refreshing');

    try {
      const result = await fetchUserProfile(userId);
      if (result) {
        setLocalUser((prev) => ({ ...prev, nickname: result.nickname, theme: result.theme }));
      } else {
        // result falsy — still consider it a completed refresh
        console.warn('fetchUserProfile returned no data');
        addToast({ title: 'Refresh', message: 'No profile data returned', type: 'info' });
      }
    } catch (err: any) {
      console.error('Error refreshing profile:', err?.message ?? err);
      addToast({ title: 'Refresh failed', message: 'Could not refresh profile', type: 'error' });
    } finally {
      // ALWAYS clear the refreshing flag
      setRefreshing(false);
    }
  }, [refreshing, userId, setLocalUser, addToast]);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} />
      }>
      {/* content */}
      <View className="flex-1 bg-transparent px-4 py-2">
        {/* Top refresh indicator: small inline ActivityIndicator for clearer feedback on static pages */}
        {refreshing ? (
          <View className="mb-3 items-center">
            <ActivityIndicator size="small" />
          </View>
        ) : null}

        {/* User card */}
        <View
          className={`
          mb-4 rounded-2xl bg-white px-3 py-4
          ${Platform.OS === 'ios' ? 'shadow' : 'elevation-2'}
        `}>
          <View className="mb-2 items-center">
            <Avatar size={100} name={editName} />
          </View>

          {/* Name row with leading edit icon */}
          <View className="items-center">
            <View className="flex-row items-center">
              {!isEditingName ? (
                <>
                  <Text
                    accessibilityRole="header"
                    className="text-xl text-gray-800"
                    numberOfLines={1}>
                    {editName}
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
                    value={editName}
                    onChangeText={setEditName}
                    className="min-w-40 rounded-md border border-violet-100 px-2 py-1 text-xl text-gray-800"
                    placeholder="Your name"
                    returnKeyType="done"
                    onSubmitEditing={onSave}
                    editable={!isSaving}
                    accessible
                    accessibilityLabel="Edit your display name"
                  />

                  <TouchableOpacity
                    onPress={onSave}
                    activeOpacity={0.8}
                    className="ml-3 items-center justify-center rounded-full bg-green-600 p-2"
                    disabled={isSaving || !userId || editName.trim().length === 0}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={cancelEdit}
                    activeOpacity={0.8}
                    className="ml-2 items-center justify-center rounded-full bg-gray-200 p-2"
                    disabled={isSaving}>
                    <Ionicons name="close" size={18} color="#374151" />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Contact info */}
            <Text className="mt-3 text-sm text-gray-500">{localUser?.email}</Text>
            {localUser?.phone ? (
              <Text className="text-sm text-gray-500">{localUser?.phone}</Text>
            ) : null}
          </View>
        </View>

        {/* Preferences */}
        <Text
          style={{ color: theme.colors.textPrimary }}
          className="mb-2 mt-1 text-xl font-extrabold">
          Preferences
        </Text>
        <View
          className={`
          mb-4 rounded-2xl bg-white px-3 py-2
          ${Platform.OS === 'ios' ? 'shadow' : 'elevation-2'}
        `}>
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
            value={darkModeEnabled}
            onValueChange={onToggleTheme} // Switch will pass the new boolean
          />
        </View>

        {/* Data & Security */}
        <Text
          style={{ color: theme.colors.textPrimary }}
          className="mb-2 mt-1 text-xl font-extrabold">
          Data & Security
        </Text>
        <View
          className={`
          mb-6 rounded-2xl bg-white px-3 py-2
          ${Platform.OS === 'ios' ? 'shadow' : 'elevation-2'}
        `}>
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center py-3">
      <LeadingIcon name={icon} color={iconTint} />
      <Text className="flex-1 text-base font-bold text-gray-900">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
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
