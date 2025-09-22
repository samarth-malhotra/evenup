// tailwind.config.js (NativeWind / RN focused)
// Reads theme/tokens-export.json and maps tokens (light) to Tailwind colors statically.

const path = require('path');
const tokensPath = path.join(__dirname, 'theme', 'tokens-export.json');

let tokens = {};
try {
  tokens = require(tokensPath);
} catch (err) {
  console.warn(
    '[tailwind.config] could not load tokens-export.json at',
    tokensPath,
    '-',
    err.message
  );
  tokens = {};
}

/** helpers **/
const px = (v) => (typeof v === 'number' ? `${v}px` : v || '0px');

function isPlainColor(val) {
  return typeof val === 'string' || typeof val === 'number';
}

/** --- Colors (static from light tokens) --- */
const lightColors = (tokens.colors && tokens.colors.light) || {};
const colorMap = {};

// preserve nested color objects (primary: { DEFAULT, light, dark }) so Tailwind generates bg-primary, bg-primary-light
Object.entries(lightColors).forEach(([key, val]) => {
  if (isPlainColor(val)) {
    colorMap[key] = val;
  } else if (val && typeof val === 'object') {
    colorMap[key] = {};
    Object.entries(val).forEach(([subk, subv]) => {
      if (isPlainColor(subv)) {
        colorMap[key][subk] = subv;
        // also add a flat alias like "key-subk" -> value so bg-danger-light works as well
        colorMap[`${key}-${String(subk).toLowerCase()}`] = subv;
      }
    });
  }
});

/** --- Fonts --- */
const fontFamilyTokens = tokens.fontFamily || {};
const fontFamily = {
  heading: [fontFamilyTokens.heading || 'Inter-SemiBold', 'system-ui', 'sans-serif'],
  body: [fontFamilyTokens.body || 'Inter-Regular', 'system-ui', 'sans-serif'],
};

/** --- Spacing (dynamic mapping) --- */
const spacingTokens = tokens.spacing || {};
const spacing = {};
Object.entries(spacingTokens).forEach(([k, v]) => {
  const name = k.startsWith('space') ? k.replace(/^space/, '').toLowerCase() : k;
  spacing[name] = px(v);
});

/** --- Shadows (converted from native ios tokens; useful for web but harmless here) --- */
const shadowsTokens = tokens.shadows || {};
const boxShadow = {};
Object.entries(shadowsTokens).forEach(([k, v]) => {
  if (v && typeof v === 'object' && v.ios) {
    const color =
      v.ios.shadowColor ||
      (tokens.colors && tokens.colors.light && tokens.colors.light.shadowColor) ||
      '#000';
    const offsetX = v.ios.shadowOffset?.width ?? 0;
    const offsetY = v.ios.shadowOffset?.height ?? 0;
    const radius = v.ios.shadowRadius ?? 4;
    const opacity = typeof v.ios.shadowOpacity === 'number' ? v.ios.shadowOpacity : 0.05;
    // convert hex -> rgba inline
    const hex = (String(color) || '#000').replace('#', '');
    const fullHex =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    const bigint = parseInt(fullHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    boxShadow[k] = `${offsetX}px ${offsetY}px ${radius}px rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
});

// default card shadow
if (!boxShadow.card) {
  boxShadow.card = `0px 6px 18px rgba(15, 23, 42, 0.05)`;
}

module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './lib/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  darkMode: 'class', // harmless for RN, useful if you later use web
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: colorMap,
      fontFamily,
      spacing,
      boxShadow,
    },
  },
  plugins: [],
};
