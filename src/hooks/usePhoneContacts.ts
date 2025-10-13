// src/hooks/usePhoneContacts.ts
// Expo + React Native + TypeScript
// Cache-first contacts hook: returns persisted cached contacts immediately,
// then revalidates in background and updates the persisted cache.
//
// Assumes you have:
// - expo-contacts installed
// - jotai + a persistedAtom helper at '@/stores/utils/persistedAtom'
//
// Example usage:
// const { contacts, loading, error, refresh } = usePhoneContacts();
// OR read atom elsewhere: const [cached] = useAtom(phoneContactsAtom);

import * as Contacts from 'expo-contacts';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';

import type { ContactItem } from '@/stores/atoms/contacts';
import { phoneContactsAtom } from '@/stores/atoms/contacts';
import { normalizePhone } from '@/utils/normalise';

type TempPhone = {
  id: string;
  label?: string | null;
  number: string;
  _normalized: string | null;
};

/**
 * usePhoneContacts - returns cached contacts immediately (if any),
 * revalidates in background and updates cache, and exposes refresh()
 */
export default function usePhoneContacts() {
  const [cachedContacts, setCachedContacts] = useAtom(phoneContactsAtom);
  const [contacts, setContacts] = useState<ContactItem[]>(cachedContacts || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mapContacts = useCallback((data: Contacts.Contact[]) => {
    // First, map and clean
    const mapped = data.map((c, contactIdx) => {
      const contactId = c.id ?? `unknown-${contactIdx}-${(c.name || '').replace(/\s+/g, '_')}`;

      // --- Deduplicate phones per contact ---
      const seenPhones = new Set<string>();
      const tempPhones: TempPhone[] = (c.phoneNumbers || []).map((p, idx) => {
        const raw = p.number ?? '';
        const normalized = normalizePhone(raw); // your libphonenumber-js based fn
        return {
          id: `${contactId}-${idx}`,
          label: p.label ?? null,
          number: raw,
          _normalized: normalized,
        };
      });

      const phones = tempPhones
        .filter((tp) => {
          if (!tp.number) return false;
          const key = tp._normalized ?? tp.number.replace(/\D/g, '');
          if (!key) return false;
          if (seenPhones.has(key)) return false;
          seenPhones.add(key);
          return true;
        })
        .map(({ id, label, number }) => ({ id, label, number }));

      // --- Deduplicate emails ---
      const seenEmails = new Set<string>();
      const emails = (c.emails || [])
        .map((e) => (e.email ?? '').trim().toLowerCase())
        .filter(Boolean)
        .filter((em) => {
          if (seenEmails.has(em)) return false;
          seenEmails.add(em);
          return true;
        });

      return {
        id: contactId,
        name: c.name ?? null,
        emails,
        phones,
      } as ContactItem;
    });

    // --- Sort alphabetically (case-insensitive, nulls last) ---
    return mapped.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1; // nulls last
      if (!nameB) return -1;
      return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });
  }, []);

  /**
   * loadContacts(force = false)
   * - if force === false and cached exists -> immediately return cached and revalidate in background
   * - if force === true -> fetch fresh, replace cache & state
   */
  const loadContacts = useCallback(
    async (force = false) => {
      // If cache exists and not forcing, return cached immediately and revalidate in background.
      if (!force && cachedContacts && cachedContacts.length > 0) {
        setContacts(cachedContacts);

        // background revalidation (fire-and-forget). Errors ignored so cache isn't wiped on failure.
        (async () => {
          try {
            const { status } = await Contacts.requestPermissionsAsync();
            console.log('fetching [phones contact]');

            if (status !== 'granted') return;
            const fields: Contacts.FieldType[] = [
              Contacts.Fields.PhoneNumbers,
              Contacts.Fields.Emails,
            ];
            const { data } = await Contacts.getContactsAsync({ fields });
            if (!data || data.length === 0) return;
            const mapped = mapContacts(data);
            setCachedContacts(mapped);
            setContacts(mapped);
          } catch {
            /* ignore background errors */
          }
        })();

        return;
      }

      // Normal (forced) fetch path
      setLoading(true);
      setError(null);
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
          setContacts([]);
          setCachedContacts([]);
          setError(new Error('Contacts permission not granted'));
          setLoading(false);
          return;
        }

        const fields: Contacts.FieldType[] = [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails];
        const { data } = await Contacts.getContactsAsync({ fields });
        // console.log('fetching [phones contact]');
        if (!data || data.length === 0) {
          setContacts([]);
          setCachedContacts([]);
          setLoading(false);
          return;
        }

        const mapped = mapContacts(data);
        setContacts(mapped);
        setCachedContacts(mapped);
      } catch (e: any) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
      }
    },
    [cachedContacts, mapContacts, setCachedContacts]
  );

  useEffect(() => {
    // On mount: if cached exists show it immediately and revalidate in background,
    // otherwise perform a forced fetch.
    if (cachedContacts && cachedContacts.length > 0) {
      setContacts(cachedContacts);
      loadContacts(false);
    } else {
      loadContacts(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    contacts,
    loading,
    error,
    refresh: () => loadContacts(true),
  } as const;
}
