import type { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { seed } from './mock';
import type { Activity } from './types';

const STORAGE_KEY = 'evenup.notifications.v1';

export async function loadActivities(): Promise<Activity[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return seed;
  try {
    const parsed: Activity[] = JSON.parse(raw);
    // In case you deploy new seed, merge unseen seed items:
    const byId = new Map(parsed.map((a) => [a.id, a]));
    seed.forEach((s) => {
      if (!byId.has(s.id)) parsed.unshift(s);
    });
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return seed;
  }
}

export async function saveActivities(list: Activity[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ---------- Date grouping ----------
export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function splitSections(items: Activity[]) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const todayItems: Activity[] = [];
  const yesterdayItems: Activity[] = [];
  const earlierItems: Activity[] = [];

  items.forEach((it) => {
    const d = new Date(it.createdAt);
    if (isSameDay(d, now)) todayItems.push(it);
    else if (isSameDay(d, yesterday)) yesterdayItems.push(it);
    else earlierItems.push(it);
  });

  const sections = [
    { title: 'Today', data: todayItems },
    { title: 'Yesterday', data: yesterdayItems },
    { title: 'Earlier', data: earlierItems },
  ].filter((s) => s.data.length > 0);

  return sections;
}

export function pickIconName(cat?: Activity['category']): keyof typeof Feather.glyphMap {
  switch (cat) {
    case 'expense':
      return 'tag';
    case 'settlement':
      return 'credit-card';
    case 'group':
      return 'users';
    default:
      return 'bell';
  }
}

export function pickAvatarTint(cat?: Activity['category']) {
  switch (cat) {
    case 'expense':
      return { backgroundColor: '#FFE4D6' };
    case 'settlement':
      return { backgroundColor: '#E6F8EF' };
    case 'group':
      return { backgroundColor: '#E6EBFF' };
    default:
      return { backgroundColor: '#F3F4F6' };
  }
}

export function timeAgo(ts: number) {
  const diff = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
