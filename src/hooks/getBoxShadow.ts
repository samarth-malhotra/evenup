// lib/theme/getBoxShadow.ts
import type { ViewStyle } from 'react-native';

import { tokens } from '@/theme/tokens';

export function getBoxShadow(level: keyof typeof tokens.shadows): ViewStyle {
  const entry = tokens.shadows[level];
  if (!entry) return {};
  return {
    shadowColor: entry.ios?.shadowColor,
    shadowOffset: entry.ios?.shadowOffset,
    shadowOpacity: entry.ios?.shadowOpacity,
    shadowRadius: entry.ios?.shadowRadius,
    elevation: (entry.android && (entry.android.elevation ?? entry.android)) ?? undefined,
  };
}
