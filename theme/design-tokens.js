// lib/design-tokens.js
const tokens = {
  colors: {
    // Brand (EvenUp) — tuned palette
    'evenup-primary': {
      DEFAULT: '#7C3AED',
      light: '#9F7CF6',
      dark: '#5B21B6',
    },
    'evenup-accent': {
      DEFAULT: '#06B6D4',
      light: '#67E8F9',
      dark: '#0891B2',
    },

    // Semantic mapping (single-source values)
    primary: {
      DEFAULT: '#7C3AED',
      light: '#9F7CF6',
      dark: '#5B21B6',
    },
    secondary: {
      DEFAULT: '#06B6D4',
      light: '#67E8F9',
      dark: '#0891B2',
    },

    // Surfaces & utilities
    surface: '#FFFFFF',
    background: '#F8FAFC',
    muted: '#9CA3AF',
    success: '#10B981',
    warning: '#F97316',
    error: '#EF4444',

    // On-colors for contrast
    'evenup-on-primary': '#FFFFFF',
    'evenup-on-surface': '#0F172A',
  },

  radii: {
    xl: '1rem',
    '2xl': '1.5rem',
  },

  shadows: {
    card: {
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 }, // smaller vertical offset
        shadowOpacity: 0.05, // lighter opacity
        shadowRadius: 6, // smaller blur
      },
      android: {
        elevation: 2, // lighter elevation
      },
    },
  },

  fonts: {
    sans: ['Inter', 'ui-sans-serif', 'system-ui'],
  },
};

module.exports = tokens;
