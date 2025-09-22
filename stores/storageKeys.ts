import { CONFIG } from '@/config';

// src/store/storageKeys.ts
const PREFIX = `evenup:${CONFIG.APP_VERSION}:`;

export const STORAGE_KEYS = {
  USER: `${PREFIX}user`,
  THEME: `${PREFIX}theme`,
  NOTIFICATIONS: `${PREFIX}notifications`,
} as const;

// Optional helper type (so TS infers union of all keys)
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
