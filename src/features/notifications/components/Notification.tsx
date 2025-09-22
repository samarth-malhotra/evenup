import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/components/AppHeader';

import { styles } from '@/features/notifications/style';
import {
  loadActivities,
  pickAvatarTint,
  pickIconName,
  saveActivities,
  splitSections,
  timeAgo,
} from '@/features/notifications/util';
import { useTheme } from '@/hooks/useTheme';
import type { Activity } from '../types';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const [list, setList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(() => list.filter((a) => !a.read).length, [list]);
  const sections = useMemo(() => splitSections(list), [list]);

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Notifications" showBackButton />,
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const data = await loadActivities();
      setList(data);
      setLoading(false);
    })();
  }, []);

  const toggleRead = useCallback(async (id: string) => {
    setList((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a));
      saveActivities(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setList((prev) => {
      const next = prev.map((a) => ({ ...a, read: true }));
      saveActivities(next);
      return next;
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // simulate fetch
    const data = await loadActivities();
    setList(data);
    setRefreshing(false);
  }, []);

  const renderItem = ({ item }: { item: Activity }) => {
    const unread = !item.read;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => toggleRead(item.id)}
        style={[styles.row, unread ? styles.rowUnread : styles.rowRead]}>
        <View style={[styles.avatar, pickAvatarTint(item.category)]}>
          <Feather name={pickIconName(item.category)} size={18} />
        </View>

        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={[styles.title, unread && styles.titleUnread]}>
            {item.title}
          </Text>
          {!!item.subtitle && (
            <Text numberOfLines={1} style={styles.subtitle}>
              {item.subtitle}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {!!item.amountText && <Text style={styles.amount}>{item.amountText}</Text>}
          <View style={styles.rightMeta}>
            {unread && <View style={styles.unreadDot} />}
            <Text>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <>
      {/* Top bar */}
      <View style={styles.topBar}>
        {/* <Text style={styles.screenTitle}>Notifications</Text> */}

        <TouchableOpacity
          accessibilityRole="button"
          onPress={markAllRead}
          disabled={unreadCount === 0}
          style={[styles.markAllBtn, unreadCount === 0 && { opacity: 0.5 }]}>
          <Feather name="check-circle" size={18} />
          <Text style={styles.markAllText}>
            Mark all as read{unreadCount ? ` (${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </>
  );
}
