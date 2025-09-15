// lib/theme/tokens.ts
export const tokens = {
  colors: {
    light: {
      background: '#FFFFFF',
      surface: '#F8FAFC',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',

      primary: {
        DEFAULT: '#7C3AED', // violet-600
        light: '#9F7CF6', // lighter
        dark: '#5B21B6', // darker
      },

      success: {
        DEFAULT: '#16A34A',
        light: '#4ADE80',
        dark: '#166534',
      },
      danger: {
        DEFAULT: '#DC2626',
        light: '#F87171',
        dark: '#991B1B',
      },
      warning: {
        DEFAULT: '#D97706',
        light: '#FBBF24',
        dark: '#92400E',
      },
      info: {
        DEFAULT: '#0284C7',
        light: '#38BDF8',
        dark: '#075985',
      },

      muted: '#9CA3AF',
      highlight: '#EEF2FF',
    },

    dark: {
      background: '#0F172A',
      surface: '#1E293B',
      textPrimary: '#F9FAFB',
      textSecondary: '#9CA3AF',
      border: '#374151',

      primary: {
        DEFAULT: '#7C3AED',
        light: '#9F7CF6',
        dark: '#5B21B6',
      },

      success: {
        DEFAULT: '#16A34A',
        light: '#4ADE80',
        dark: '#166534',
      },
      danger: {
        DEFAULT: '#DC2626',
        light: '#F87171',
        dark: '#991B1B',
      },
      warning: {
        DEFAULT: '#D97706',
        light: '#FBBF24',
        dark: '#92400E',
      },
      info: {
        DEFAULT: '#0284C7',
        light: '#38BDF8',
        dark: '#075985',
      },

      muted: '#6B7280',
      highlight: '#312E81',
    },
  },
  fontFamily: {
    heading: 'Inter-SemiBold',
    body: 'Inter-Regular',
  },
  spacing: {
    spaceXS: 4,
    spaceSM: 8,
    spaceMD: 16,
    spaceLG: 24,
    spaceXL: 32,
  },
  shadows: {
    sm: {
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    },
    md: {
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    },
    lg: {
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    },
    xl: {
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 18,
      },
      android: { elevation: 10 },
    },
  },
} as const;

export type Tokens = typeof tokens;
export type ColorTokens = typeof tokens.colors.light;
export type FontTokens = typeof tokens.fontFamily;
export type SpacingTokens = typeof tokens.spacing;
export type ShadowTokens = typeof tokens.shadows;
