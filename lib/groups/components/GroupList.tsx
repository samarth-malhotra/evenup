import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import WaveHeader from '@/lib/shared/components/WaveHeader';

import { groups } from '../mocks/groupList';

export default function GroupList() {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(t));
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header with wave + "New Group" pill */}
      <View style={{ position: 'relative' }}>
        <WaveHeader />
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/groups/new')}
          style={styles.newBtn}
          activeOpacity={0.9}>
          <Text style={styles.newBtnText}>New Group</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={styles.title}>Groups</Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => router.push(`/(tabs)/groups/${item.id}`)}>
              <Image source={{ uri: item.img }} style={styles.avatar} />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.badge,
                  item.type === 'owe'
                    ? styles.badgeOwe
                    : item.type === 'owed'
                      ? styles.badgeOwed
                      : styles.badgeSettled,
                ]}>
                <Text
                  style={[
                    styles.badgeText,
                    item.type === 'owe'
                      ? styles.badgeTextOwe
                      : item.type === 'owed'
                        ? styles.badgeTextOwed
                        : styles.badgeTextSettled,
                  ]}
                  numberOfLines={1}>
                  {item.badge}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  newBtnText: { fontWeight: '700', color: '#111827' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  searchWrap: {
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  cardTitle: { flex: 1, fontWeight: '700', color: '#111827' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeOwe: { backgroundColor: '#FFF2EC' },
  badgeOwed: { backgroundColor: '#ECFDF5' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextOwe: { color: '#EA580C' },
  badgeTextOwed: { color: '#059669' },
  badgeSettled: { backgroundColor: '#F3F4F6' }, // neutral grey
  badgeTextSettled: { color: '#6B7280' }, // subtle text
});
