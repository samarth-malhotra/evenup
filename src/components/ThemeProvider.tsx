import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import type { ColorTokens, FontTokens, ShadowTokens, SpacingTokens } from '@/theme/tokens';
import { tokens } from '@/theme/tokens';
import { flattenObject } from '@/theme/utils';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

export type NestedTheme = {
  colors: ColorTokens;
  fontFamily: FontTokens;
  spacing: SpacingTokens;
  shadows: ShadowTokens;
  textShadows?: any;
};

export type ThemeContextType = {
  mode: ThemePreference;
  resolved: ResolvedMode;
  setMode: (m: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
  theme: NestedTheme;
  flatTheme: Record<string, string | number>;
  loading: boolean;
};

/** Build a default theme from static tokens (light) to use as fallback context */
const defaultResolved: ResolvedMode = 'light';
const defaultNestedTheme: NestedTheme = {
  colors: tokens.colors[defaultResolved],
  fontFamily: tokens.fontFamily,
  spacing: tokens.spacing,
  shadows: tokens.shadows,
  textShadows: (tokens as any).textShadows,
};

const noopAsync = async () => {};

/** Default context used when consumer is outside provider */
const defaultContext: ThemeContextType = {
  mode: 'light',
  resolved: defaultResolved,
  setMode: async (m: ThemePreference) => {
    // no-op when outside provider
    return;
  },
  toggleTheme: noopAsync,
  theme: defaultNestedTheme,
  flatTheme: flattenObject(defaultNestedTheme),
  loading: false,
};

export const ThemeContext = createContext<ThemeContextType>(defaultContext);

const STORAGE_KEY = 'evenup:themePreference';

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialMode?: ThemePreference;
}> = ({ children, initialMode }) => {
  const system = useColorScheme();
  const systemMode: ResolvedMode = system === 'dark' ? 'dark' : 'light';

  const [mode, setModeState] = useState<ThemePreference>(initialMode ?? defaultContext.mode);
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
    // @ts-expect-error - tokens.textShadows might be optional in the tokens typing
    const colorGroup: ColorTokens = tokens.colors[resolved];
    return {
      colors: colorGroup,
      fontFamily: tokens.fontFamily,
      spacing: tokens.spacing,
      shadows: tokens.shadows,
      textShadows: (tokens as any).textShadows,
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
