// src/theme/script/sync-tailwind.js
// CommonJS version that uses ts-node/register so we can require .ts tokens.
// Run with: node src/theme/script/sync-tailwind.js

// Register ts-node so require() can load .ts files.
// If you already have ts-node installed this will be a no-op; otherwise install with:
//   npm i -D ts-node typescript
try {
  require('ts-node/register/transpile-only');
} catch (e1) {
  try {
    require('ts-node/register');
  } catch (e2) {
    console.error('ts-node is not installed. Install dev deps: npm i -D ts-node typescript');
    process.exit(1);
  }
}

const fs = require('fs');
const path = require('path');

function safeRequire(p) {
  try {
    const resolved = path.resolve(p);
    // print for debugging
    const mod = require(resolved);
    return mod;
  } catch (err) {
    // print full error so we know why require failed
    console.error('Require failed for:', p);
    console.error(err && err.stack ? err.stack : err);
    return null;
  }
}

// sanitize general tokens for tokens-export.json: keep primitives, arrays, plain objects
function sanitize(value) {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (t === 'object') {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      const sv = sanitize(v);
      if (typeof sv !== 'undefined') out[k] = sv;
    });
    return out;
  }
  return undefined; // skip functions/symbols/undefined
}

// sanitize colors recursively but only keep string primitives or nested plain objects of strings/numbers
function sanitizeColorsRecursive(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === null) return; // skip
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out[k] = v;
    } else if (Array.isArray(v)) {
      const arr = v
        .map((x) => (typeof x === 'string' || typeof x === 'number' ? x : undefined))
        .filter((x) => typeof x !== 'undefined');
      if (arr.length) out[k] = arr;
    } else if (t === 'object') {
      const nested = sanitizeColorsRecursive(v);
      if (Object.keys(nested).length) out[k] = nested;
    }
  });
  return out;
}

function findTokenPaths(baseDir) {
  // Try plural and singular variants because that's a common mismatch
  const candidates = [path.join(baseDir, 'tokens.ts'), path.join(baseDir, 'tokens.js')];
  return candidates;
}

function loadTokensFromTheme(themeDir) {
  const paths = findTokenPaths(themeDir);

  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log('Found token file:', p);
      const mod = safeRequire(p);
      if (!mod) {
        console.warn('Found file but require failed:', p);
        continue;
      }
      // exported shape could be default or named tokens
      return mod.tokens || mod.default || mod;
    }
  }

  return null;
}

function writeJson(dest, obj) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(obj, null, 2), 'utf8');
  console.log('Wrote file:', dest);
}

(function main() {
  try {
    // base relative to this script file: adjust if your script is located elsewhere
    const scriptDir = __dirname; // CommonJS __dirname available
    // assume theme folder sits at ../../theme from this script (adjust if needed)
    const themeDir = path.join(scriptDir, '..', '..', 'theme');
    console.log('scriptDir:', scriptDir);

    const tokensObj = loadTokensFromTheme(themeDir);
    if (!tokensObj) {
      console.error(
        'Could not find token.ts or token.js in /theme. Please ensure one of these exists in:',
        themeDir
      );
      process.exit(1);
    }

    // tokens may be exported as { tokens: {...} } or default or direct object
    const tokens = tokensObj.tokens || tokensObj.default || tokensObj;

    // write full sanitized tokens-export.json
    const sanitized = sanitize(tokens);
    const exportDest = path.join(scriptDir, '..', 'build', 'tokens-export.json');
    writeJson(exportDest, sanitized);

    // build nested colors object (preserve nested structure like primary.DEFAULT)
    const colors = tokens && tokens.colors ? tokens.colors : null;
    const colorsOut = { colors: { light: {}, dark: {} } };

    if (colors && typeof colors === 'object') {
      const light =
        colors.light && typeof colors.light === 'object'
          ? sanitizeColorsRecursive(colors.light)
          : {};
      const dark =
        colors.dark && typeof colors.dark === 'object' ? sanitizeColorsRecursive(colors.dark) : {};
      colorsOut.colors.light = light;
      colorsOut.colors.dark = dark;
    } else {
      console.warn('No tokens.colors found in tokens file. tailwind-colors.json will be empty.');
    }

    const colorsDest = path.join(scriptDir, '..', 'build', 'tailwind-colors.json');
    writeJson(colorsDest, colorsOut);

    console.log('Sync complete. Restart Metro/Expo to pick up tailwind config changes.');
    process.exit(0);
  } catch (err) {
    console.error('Error in sync script:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
