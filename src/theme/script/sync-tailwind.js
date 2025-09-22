// scripts/sync-tailwind.js
// Writes:
//  - theme/tokens-export.json       (full sanitized tokens)
//  - theme/tailwind-colors.json     (nested { colors: { light: {...}, dark: {...} } })
// This script preserves nested color objects (e.g. primary.DEFAULT) so Tailwind can import them directly.

const fs = require('fs');
const path = require('path');

function safeRequire(p) {
  try {
    return require(p);
  } catch (err) {
    return null;
  }
}

function tryLoadTokens() {
  const tsPath = path.join(__dirname, '../..', 'theme', 'tokens.ts');
  const jsPath = path.join(__dirname, '../..', 'theme', 'tokens.js');
  const indexTsPath = path.join(__dirname, '../..', 'theme', 'tokens', 'index.ts');
  const indexJsPath = path.join(__dirname, '../..', 'theme', 'tokens', 'index.js');

  // 1) If tokens.ts exists, try to require it using ts-node (if available)
  if (fs.existsSync(tsPath) || fs.existsSync(indexTsPath)) {
    try {
      try {
        require('ts-node/register/transpile-only');
      } catch (err) {
        try {
          require('ts-node/register');
        } catch (err2) {
          throw new Error('ts-node-not-installed');
        }
      }

      const tokensModule = safeRequire(tsPath) || safeRequire(indexTsPath);
      if (!tokensModule) throw new Error('could-not-require-tokens-ts');
      return tokensModule.tokens || tokensModule.default || tokensModule;
    } catch (err) {
      if (err.message === 'ts-node-not-installed') {
        return { __error: 'ts-node-not-installed' };
      }
      throw err;
    }
  }

  // 2) fallback to tokens.js if exists
  if (fs.existsSync(jsPath) || fs.existsSync(indexJsPath)) {
    const tokensModule = safeRequire(jsPath) || safeRequire(indexJsPath);
    if (!tokensModule) throw new Error('could-not-require-tokens-js');
    return tokensModule.tokens || tokensModule.default || tokensModule;
  }

  return null;
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
      // not expected for colors, but keep primitive arrays
      const arr = v
        .map((x) => (typeof x === 'string' || typeof x === 'number' ? x : undefined))
        .filter((x) => typeof x !== 'undefined');
      if (arr.length) out[k] = arr;
    } else if (t === 'object') {
      // nested object (e.g. primary: { DEFAULT: "#7C3AED", light: "#..." })
      const nested = sanitizeColorsRecursive(v);
      if (Object.keys(nested).length) out[k] = nested;
    }
    // otherwise skip
  });
  return out;
}

(function main() {
  let tokensObj;
  try {
    tokensObj = tryLoadTokens();
  } catch (err) {
    console.error('Error requiring tokens:', err && err.message ? err.message : err);
    process.exit(1);
  }

  if (!tokensObj) {
    console.error(
      'Could not find tokens.ts or tokens.js in /theme. Please ensure one of these exists.\n' +
        'If you are using tokens.ts you should install ts-node as a dev dependency:\n\n  npm i -D ts-node\n\nor\n\n  pnpm add -D ts-node\n'
    );
    process.exit(1);
  }

  if (tokensObj.__error === 'ts-node-not-installed') {
    console.error(
      'Found tokens.ts but ts-node is not installed. Install it to allow the script to load TypeScript files:\n\n  npm i -D ts-node\n\nor\n\n  pnpm add -D ts-node\n'
    );
    process.exit(1);
  }

  // tokens may be exported as { tokens: {...} } or default or direct object
  const tokens = tokensObj.tokens || tokensObj.default || tokensObj;

  // write full sanitized tokens-export.json
  const sanitized = sanitize(tokens);
  const exportDest = path.join(__dirname, '..', 'build', 'tokens-export.json');
  fs.mkdirSync(path.dirname(exportDest), { recursive: true });
  fs.writeFileSync(exportDest, JSON.stringify(sanitized, null, 2), 'utf8');
  console.log('Wrote full tokens:', exportDest);

  // build nested colors object (preserve nested structure like primary.DEFAULT)
  const colors = tokens && tokens.colors ? tokens.colors : null;
  const colorsOut = { colors: { light: {}, dark: {} } };

  if (colors && typeof colors === 'object') {
    const light =
      colors.light && typeof colors.light === 'object' ? sanitizeColorsRecursive(colors.light) : {};
    const dark =
      colors.dark && typeof colors.dark === 'object' ? sanitizeColorsRecursive(colors.dark) : {};
    colorsOut.colors.light = light;
    colorsOut.colors.dark = dark;
  } else {
    console.warn('No tokens.colors found in tokens file. tailwind-colors.json will be empty.');
  }

  const colorsDest = path.join(__dirname, '..', 'build', 'tailwind-colors.json');
  fs.writeFileSync(colorsDest, JSON.stringify(colorsOut, null, 2), 'utf8');
  console.log('Wrote color mapping:', colorsDest);

  console.log('Sync complete. Restart Metro/Expo to pick up tailwind config changes.');
})();
