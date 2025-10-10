// src/utils/phone.ts
import type { CountryCode } from 'libphonenumber-js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// defaultCountry can be 'IN' for India, or you can detect from device locale
export function normalizePhoneToE164(
  raw: string,
  defaultCountry: CountryCode = 'IN'
): string | null {
  if (!raw) return null;
  // remove common separators
  const cleaned = raw.replace(/[^\d+]/g, '');
  try {
    const pn = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (!pn || !pn.isValid()) return null;
    return pn.format('E.164');
  } catch (err) {
    return null;
  }
}

/**
 * Returns libphonenumber-js's international format (with grouping)
 * Example: "+91 91234 56789"
 */
export function formatInternationalWithGrouping(
  raw: string,
  defaultCountry: CountryCode = 'IN'
): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, '');
  try {
    const pn = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (!pn || !pn.isValid()) return null;
    return pn.formatInternational();
  } catch {
    return null;
  }
}
