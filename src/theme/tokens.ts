// lib/theme/tokens.ts
// Expanded design tokens: richer color scales, gray palette, semantic aliases.
// Keep as single source of truth for light & dark themes.

export const tokens = {
  colors: {
    light: {
      /* --- Neutrals / Gray scale (light theme) --- */
      gray50: '#FAFAFB',
      gray100: '#F3F4F6',
      gray200: '#E5E7EB',
      gray300: '#D1D5DB',
      gray400: '#9CA3AF',
      gray500: '#6B7280',
      gray600: '#4B5563',
      gray700: '#374151',
      gray800: '#1F2937',
      gray900: '#111827',

      /* Primary (violet) scale */
      primary50: '#F5F3FF',
      primary100: '#EDE9FE',
      primary200: '#DDD6FE',
      primary300: '#C4B5FD',
      primary400: '#A78BFA',
      primary500: '#7C3AED', // DEFAULT (brand)
      primary600: '#6D28D9',
      primary700: '#5B21B6', // dark variant (strong)
      primary800: '#4C1D95',
      primary900: '#3B146B',

      /* Success (green) scale */
      success50: '#ECFDF5',
      success100: '#D1FAE5',
      success200: '#A7F3D0',
      success300: '#6EE7B7',
      success400: '#34D399',
      success500: '#16A34A', // DEFAULT
      success600: '#15803D',
      success700: '#166534',
      success800: '#14532D',
      success900: '#064E3B',

      /* Danger (red) scale */
      danger50: '#FFF1F2',
      danger100: '#FFE4E6',
      danger200: '#FECDD3',
      danger300: '#FDA4AF',
      danger400: '#FB7185',
      danger500: '#DC2626', // DEFAULT
      danger600: '#B91C1C',
      danger700: '#991B1B',
      danger800: '#7F1D1D',
      danger900: '#4C0519',

      /* Warning (amber) scale */
      warning50: '#FFFBEB',
      warning100: '#FEF3C7',
      warning200: '#FDE68A',
      warning300: '#FCD34D',
      warning400: '#FBBF24',
      warning500: '#D97706', // DEFAULT
      warning600: '#B45309',
      warning700: '#92400E',
      warning800: '#78350F',
      warning900: '#78350F',

      /* Info (blue/cyan) scale */
      info50: '#EFF6FF',
      info100: '#DBEAFE',
      info200: '#BFDBFE',
      info300: '#93C5FD',
      info400: '#60A5FA',
      info500: '#0284C7', // DEFAULT (strong info)
      info600: '#0369A1',
      info700: '#075985',
      info800: '#044E7C',
      info900: '#003554',

      /* Semantic shortcuts (map to scales) */
      background: '#FFFFFF', // same as gray0
      surface: '#F8FAFC', // subtle surface
      elevated: '#FFFFFF',
      card: '#FFFFFF',
      overlay: 'rgba(2,6,23,0.6)',
      inputBackground: '#F3F4F6',
      placeholder: '#9CA3AF',
      disabled: '#E5E7EB',
      muted: '#9CA3AF',
      mutedLight: '#F3F4F6',
      highlight: '#EEF2FF',
      link: '#4F46E5',
      border: '#E5E7EB',

      /* grouped semantic objects for convenience */
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

      /* Text */
      textPrimary: '#111827', // gray900
      textSecondary: '#6B7280', // gray500
      textTertiary: '#9CA3AF', // gray400
      textWhite: '#FFFFFF',
    },

    /* --- Dark theme (mirrored / tuned for dark UI) --- */
    dark: {
      /* Gray scale tuned for dark backgrounds (lighter grays) */
      gray50: '#0B1220',
      gray100: '#0F172A',
      gray200: '#111827',
      gray300: '#1F2937',
      gray400: '#374151',
      gray500: '#4B5563',
      gray600: '#6B7280',
      gray700: '#9CA3AF',
      gray800: '#D1D5DB',
      gray900: '#F3F4F6',

      /* Primary (violet) dark-friendly shades (map roughly to light counterparts) */
      primary50: '#0F0528',
      primary100: '#1C083E',
      primary200: '#2A0E56',
      primary300: '#3B146B',
      primary400: '#5B21B6',
      primary500: '#7C3AED', // keep brand DEFAULT same for recognizability
      primary600: '#8F6EFA',
      primary700: '#9F7CF6',
      primary800: '#BFA8FF',
      primary900: '#EDE9FE',

      /* Success */
      success50: '#052012',
      success100: '#06361A',
      success200: '#0A6A3E',
      success300: '#0FA96B',
      success400: '#16A34A',
      success500: '#34D399',
      success600: '#4ADE80',
      success700: '#A7F3D0',
      success800: '#ECFDF5',
      success900: '#F0FFF4',

      /* Danger */
      danger50: '#2A0506',
      danger100: '#3B0708',
      danger200: '#4C0A0C',
      danger300: '#7F1D1D',
      danger400: '#991B1B',
      danger500: '#DC2626',
      danger600: '#F87171',
      danger700: '#FECACA',
      danger800: '#FFF1F2',
      danger900: '#FFF5F5',

      /* Warning */
      warning50: '#2B1500',
      warning100: '#3B1D04',
      warning200: '#5B2E06',
      warning300: '#7A3E0A',
      warning400: '#92400E',
      warning500: '#D97706',
      warning600: '#FBBF24',
      warning700: '#FEEBC0',
      warning800: '#FFFBEB',
      warning900: '#FFF7ED',

      /* Info */
      info50: '#021428',
      info100: '#03203A',
      info200: '#053355',
      info300: '#074D73',
      info400: '#075985',
      info500: '#0284C7',
      info600: '#38BDF8',
      info700: '#93C5FD',
      info800: '#EFF6FF',
      info900: '#F0F9FF',

      /* Semantic */
      background: '#0F172A',
      surface: '#111827',
      elevated: '#0B1220',
      card: '#0F172A',
      overlay: 'rgba(2,6,23,0.75)',
      inputBackground: '#111827',
      placeholder: '#6B7280',
      disabled: '#374151',
      muted: '#6B7280',
      mutedLight: '#374151',
      highlight: '#312E81',
      link: '#8B5CF6',

      primary: {
        DEFAULT: '#7C3AED',
        light: '#9F7CF6',
        dark: '#5B21B6',
      },
      success: {
        DEFAULT: '#34D399',
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

      /* Text */
      textPrimary: '#F9FAFB',
      textSecondary: '#9CA3AF',
      textTertiary: '#D1D5DB',
      textWhite: '#FFFFFF',
    },
  },

  /* fonts, spacing, and shadows (kept + shadow levels as earlier) */
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
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    },
    md: {
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
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
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
      android: { elevation: 10 },
    },
  },

  /* text shadows */
  textShadows: {
    subtle: {
      textShadowColor: 'rgba(0,0,0,0.22)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    medium: {
      textShadowColor: 'rgba(0,0,0,0.30)',
      textShadowOffset: { width: 1, height: 2 },
      textShadowRadius: 3,
    },
    heavy: {
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 2, height: 3 },
      textShadowRadius: 4,
    },
  },
} as const;

export type Tokens = typeof tokens;
export type ColorTokens = typeof tokens.colors.light;
export type FontTokens = typeof tokens.fontFamily;
export type SpacingTokens = typeof tokens.spacing;
export type ShadowTokens = typeof tokens.shadows;
export type TextShadowTokens = typeof tokens.textShadows;
