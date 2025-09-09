// lib/hooks/useElevation.ts
import { Platform } from 'react-native';
export function useElevation(level = 4) {
  return Platform.OS === 'android' ? { elevation: level } : {};
}
