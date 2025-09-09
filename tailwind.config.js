const tokens = require('./theme/design-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // keep both semantic and brand-prefixed keys
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,

        'evenup-primary': tokens.colors['evenup-primary'],
        'evenup-secondary': tokens.colors['evenup-accent'],

        surface: tokens.colors.surface,
        background: tokens.colors.background,
        muted: tokens.colors.muted,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,

        'evenup-on-primary': tokens.colors['evenup-on-primary'],
        'evenup-on-surface': tokens.colors['evenup-on-surface'],
      },

      borderRadius: tokens.radii,
      fontFamily: tokens.fonts,
      boxShadow: tokens.shadows,
    },
  },

  plugins: [],
};
