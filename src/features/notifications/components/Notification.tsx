// NotificationsSectionScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { format } from 'libphonenumber-js';
import { format, isToday, isYesterday } from 'date-fns';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import type { ListRenderItemInfo, SectionListData } from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NotificationItem } from '@/features/notifications/hooks/useUserNotifications';
// import { useNotificationsInfinite } from '@/features/notifications/hooks/useUserNotifications';
// import type { NotificationItem } from '@/hooks/useNotificationsInfinite';
// import { useNotificationsInfinite } from '@/hooks/useNotificationsInfinite';
import {
  markAllNotificationRead as rpcMarkAllNotificationRead,
  markNotificationRead as rpcMarkNotificationRead,
  useNotificationsInfinite,
} from '@/features/notifications/hooks/useUserNotifications';
import { userAtom } from '@/stores/atoms/user';

// Section type
type Section = {
  title: 'Today' | 'Yesterday' | 'Earlier';
  data: NotificationItem[];
};

export default function NotificationsSectionScreen({ route, navigation }: any) {
  const user = useAtomValue(userAtom);
  const userId = user?.id ?? '';
  const { top } = useSafeAreaInsets();

  const {
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isRefetching,
    refetch,
    notifications,
    total,
    unread,
  } = useNotificationsInfinite({
    userId,
    limit: 50,
    onlyUnread: false,
    enabled: !!userId,
  });

  const queryClient = useQueryClient();

  // Mark single read mutation (optimistic)
  const markReadMutation = useMutation({
    mutationFn: (payload: { p_user_id: string; p_notification_id: string }) =>
      rpcMarkNotificationRead(payload),
    onMutate: async ({ p_notification_id }) => {
      const key = ['notifications', userId, { limit: 50, onlyUnread: false }];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<any>(key);

      queryClient.setQueryData<any>(key, (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.map((n: any) =>
                n.notification_id === p_notification_id ? { ...n, is_read: true } : n
              ),
            })),
            unread: Math.max(0, (old.unread ?? 0) - 1),
          };
        }
        return {
          ...old,
          notifications: (old.notifications ?? []).map((n: any) =>
            n.notification_id === p_notification_id ? { ...n, is_read: true } : n
          ),
          unread: Math.max(0, (old.unread ?? 0) - 1),
        };
      });

      return { previous };
    },
    onError: (err, vars, context: any) => {
      const key = ['notifications', userId, { limit: 50, onlyUnread: false }];
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      const key = ['notifications', userId, { limit: 50, onlyUnread: false }];
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  // Mark all read mutation
  const markAllMutation = useMutation({
    mutationFn: ({ p_user_id }: { p_user_id: string }) => rpcMarkAllNotificationRead({ p_user_id }),
    onMutate: async () => {
      const key = ['notifications', userId, { limit: 50, onlyUnread: false }];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<any>(key);
      queryClient.setQueryData<any>(key, (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.map((n: any) => ({ ...n, is_read: true })),
            })),
            unread: 0,
          };
        }
        return {
          ...old,
          notifications: (old.notifications ?? []).map((n: any) => ({ ...n, is_read: true })),
          unread: 0,
        };
      });
      return { previous };
    },
    onError: (err, vars, context: any) => {
      const key = ['notifications', userId, { limit: 50, onlyUnread: false }];
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      const key = ['notifications', userId, { limit: 50, onlyUnread: false }];
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  // Helper to group notifications into sections by date
  const sections: Section[] = useMemo(() => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    for (const n of notifications) {
      const dt = new Date(n.created_at);
      if (isToday(dt)) {
        today.push(n);
      } else if (isYesterday(dt)) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    }

    const out: Section[] = [];
    if (today.length) out.push({ title: 'Today', data: today });
    if (yesterday.length) out.push({ title: 'Yesterday', data: yesterday });
    if (earlier.length) out.push({ title: 'Earlier', data: earlier });
    return out;
  }, [notifications]);

  const onPressNotification = useCallback(
    (item: NotificationItem) => {
      if (!item.is_read) {
        markReadMutation.mutate({ p_user_id: userId, p_notification_id: item.notification_id });
      }
      // navigate or deep link here
      // navigation?.navigate('GroupDetail', { id: someIdFromNotification });
    },
    [markReadMutation, userId]
  );

  const onRefresh = useCallback(() => {
    return refetch();
  }, [refetch]);

  // infinite scroll trigger
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<NotificationItem>) => {
      return (
        <Pressable
          onPress={() => onPressNotification(item)}
          className={`flex-row items-start justify-between border-b border-gray-100 px-4 py-3 ${
            item.is_read ? 'bg-white' : 'bg-white'
          }`}>
          <View className="flex-1 pr-2">
            <Text
              className={`text-sm ${item.is_read ? 'text-gray-600' : 'font-semibold text-black'}`}>
              {item.title ?? 'Notification'}
            </Text>
            {item.body ? (
              <Text className="mt-1 text-xs text-gray-500" numberOfLines={2}>
                {item.body}
              </Text>
            ) : null}
            <Text className="mt-1 text-xs text-gray-400">{formatDateLabel(item.created_at)}</Text>
          </View>

          {!item.is_read ? (
            <View className="h-3 w-3 self-start rounded-full bg-red-500" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          )}
        </Pressable>
      );
    },
    [onPressNotification]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<NotificationItem, Section> }) => {
      return (
        <View className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <Text className="text-xs font-medium text-gray-500">{section.title}</Text>
        </View>
      );
    },
    []
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
        <Text className="text-lg font-bold">Notifications</Text>

        <View className="flex-row items-center space-x-3">
          <Text className="text-sm text-gray-500">
            {unread ?? 0}/{total} unread
          </Text>

          <Pressable
            onPress={() => markAllMutation.mutate({ p_user_id: userId })}
            className="rounded-md bg-gray-100 px-3 py-1">
            <Text className="text-sm">Mark all read</Text>
          </Pressable>
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
          <Text className="mt-3 text-center text-gray-500">You're all caught up</Text>
          <Pressable onPress={() => refetch()} className="mt-4 rounded-md bg-blue-500 px-4 py-2">
            <Text className="text-white">Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          onEndReachedThreshold={0.6}
          onEndReached={onEndReached}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

/** small helper: format created_at for display (time part) */
function formatDateLabel(iso: string) {
  try {
    const d = new Date(iso);
    // show time for Today/Yesterday, or full date for earlier
    return format(d, 'p'); // e.g. 4:30 PM
  } catch (e) {
    return iso;
  }
}
