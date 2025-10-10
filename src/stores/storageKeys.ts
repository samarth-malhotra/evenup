// src/store/storageKeys.ts
import { CONFIG } from '@/config';

const PREFIX = `evenup:${CONFIG.APP_VERSION}:`;

// AsynStorage Keys
export const STORAGE_KEYS = {
  THEME_PREFERENCE: `${PREFIX}themePreference`,
  USER: `${PREFIX}user`,
  THEME: `${PREFIX}theme`,
  NOTIFICATIONS: `${PREFIX}notifications`,
  GROUPLIST: `${PREFIX}group-list`,
} as const;

// Optional helper type (so TS infers union of all keys)
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
