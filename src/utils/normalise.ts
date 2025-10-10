// utils/contactNormalize.ts
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export type NormalizedPhoneResult = {
  e164?: string; // "+911234567890"
  digits?: string; // "911234567890" (no plus)
  international?: string; // "+91 12345 67890" (formatted)
};

/**
 * Format a phone number to an international human-readable format.
 * Example: input "91234567890" or "1234567890" with defaultCountry='IN'
 * returns: "+91 12345 67890"
 *
 * @param raw Phone input (may include spaces, dashes, parens, leading 0, etc)
 * @param defaultCountry ISO country code used to parse when no explicit country code present. Defaults to 'IN'.
 * @returns formatted international string or null if invalid
 */
export function formatPhoneInternational(raw: string, defaultCountry = 'IN'): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const parsed = parsePhoneNumberFromString(raw, defaultCountry as any);
  if (!parsed || !parsed.isValid()) return null;
  // formatInternational gives e.g. "+91 12345 67890"
  return parsed.formatInternational();
}

/**
 * Return cleaned digits-only phone string with country code, but WITHOUT the leading '+'.
 * Example: "+911234567890" -> "911234567890"
 *
 * @param raw Phone input string
 * @param defaultCountry ISO country code for parsing when no country present. Defaults to 'IN'.
 * @returns digits-only normalized phone (country code + national number) or null if invalid
 */
export function normalizePhone(raw: string, defaultCountry = 'IN'): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const parsed = parsePhoneNumberFromString(raw, defaultCountry as any);
  if (!parsed || !parsed.isValid()) return null;
  const e164 = parsed.format('E.164'); // "+911234567890"
  return e164 ? e164.replace(/^\+/, '') : null;
}

/**
 * Normalize email by trimming and lowercasing.
 * Example: "  John.Doe@Example.COM  " -> "john.doe@example.com"
 */
export function normalizeEmail(rawEmail: string): string | null {
  if (!rawEmail || typeof rawEmail !== 'string') return null;

  const email = rawEmail.trim().toLowerCase();
  // Quick sanity check — not a full validation
  return email.includes('@') ? email : null;
}
