// lib/theme/utils.ts
type AnyObj = Record<string, any>;

/** Flatten nested object to dot-delimited keys (primitives only) */
export function flattenObject(obj: AnyObj, prefix = ''): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  Object.entries(obj).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenObject(v, key));
    } else if (typeof v === 'string' || typeof v === 'number') {
      out[key] = v;
    }
  });
  return out;
}

/** Map tokens to CSS variables (for web only). Example usage: mapTokensToCssVars(tokens.colors.light) */
export function mapTokensToCssVars(obj: AnyObj, prefix = '--color-'): Record<string, string> {
  const out: Record<string, string> = {};
  function recurse(current: AnyObj, path = '') {
    Object.entries(current).forEach(([k, v]) => {
      const newKey = path ? `${path}-${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        recurse(v, newKey);
      } else {
        out[`${prefix}${newKey}`] = String(v);
      }
    });
  }
  recurse(obj);
  return out;
}
