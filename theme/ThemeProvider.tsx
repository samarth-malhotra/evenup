// lib/theme/ThemeProvider.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ColorTokens, FontTokens, ShadowTokens, SpacingTokens, tokens } from './tokens';
import { flattenObject } from './utils';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export type NestedTheme = {
  colors: ColorTokens;
  fontFamily: FontTokens;
  spacing: SpacingTokens;
  shadows: ShadowTokens;
};

type ThemeContextType = {
  mode: ThemePreference;
  resolved: ResolvedMode;
  setMode: (m: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
  theme: NestedTheme;
  flatTheme: Record<string, string | number>;
  loading: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY = 'evenup:themePreference';

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialMode?: ThemePreference;
}> = ({ children, initialMode }) => {
  const system = useColorScheme();
  const systemMode: ResolvedMode = system === 'dark' ? 'dark' : 'light';

  const [mode, setModeState] = useState<ThemePreference>(initialMode ?? 'system');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw === 'light' || raw === 'dark' || raw === 'system') setModeState(raw);
        else setModeState(initialMode ?? 'system');
      } catch {
        setModeState(initialMode ?? 'system');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [initialMode]);

  const resolved = useMemo<ResolvedMode>(() => {
    if (mode === 'system') return systemMode;
    return mode === 'dark' ? 'dark' : 'light';
  }, [mode, systemMode]);

  const persistMode = async (m: ThemePreference) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, m);
    } catch {
      // ignore
    }
  };

  const setMode = async (m: ThemePreference) => {
    setModeState(m);
    await persistMode(m);
  };

  const toggleTheme = async () => {
    const newPref: ThemePreference =
      mode === 'system'
        ? resolved === 'dark'
          ? 'light'
          : 'dark'
        : mode === 'dark'
          ? 'light'
          : 'dark';
    await setMode(newPref);
  };

  const theme: NestedTheme = useMemo(() => {
    const colorGroup: ColorTokens = tokens.colors[resolved];
    return {
      colors: colorGroup,
      fontFamily: tokens.fontFamily,
      spacing: tokens.spacing,
      shadows: tokens.shadows,
    };
  }, [resolved]);

  const flatTheme = useMemo(() => flattenObject(theme), [theme]);

  const ctx: ThemeContextType = {
    mode,
    resolved,
    setMode,
    toggleTheme,
    theme,
    flatTheme,
    loading,
  };

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
