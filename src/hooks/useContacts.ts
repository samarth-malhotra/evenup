import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useSetAtom } from 'jotai';
import pLimit from 'p-limit';
import { useEffect, useRef } from 'react';

import { useAccessToken } from '@/hooks/useAccessToken';
import { callContactsMatchHashedContacts } from '@/services/contacts';
import { contactsAtom } from '@/stores/atoms/contacts';
import { sha256Hex } from '@/utils/hash';
import { normalizePhoneToE164 } from '@/utils/phone';

export type ContactDisplayItem = {
  localId: string;
  contact_name?: string | null;
  rawPhones?: string[];
  rawEmails?: string[];
  matched?: boolean;
  phoneMatched?: boolean;
  emailMatched?: boolean;
  match_source?: 'phone' | 'email' | 'both' | null;
  profile_id?: string | null;
  status?: string | null;
  ambiguous?: boolean;
  matched_profiles?: any[] | null;
};

const CACHE_KEY = 'evenup:contacts:matched:v2';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const BATCH_SIZE = 200;
const CONCURRENCY = 2;

async function loadCacheFromStorage(): Promise<ContactDisplayItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; data?: ContactDisplayItem[] } | null;
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

async function saveCacheToStorage(data: ContactDisplayItem[]) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    console.warn('[useContacts] cache save failed', e);
  }
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function buildHashesForContact(contact: {
  localId: string;
  contact_name?: string | null;
  phonesNormalized?: string[];
  emailsNormalized?: string[];
}) {
  const phone_hashes = await Promise.all(
    (contact.phonesNormalized || []).map(async (p) => {
      try {
        return await sha256Hex(p);
      } catch {
        return null;
      }
    })
  );

  const email_hashes = await Promise.all(
    (contact.emailsNormalized || []).map(async (e) => {
      try {
        return await sha256Hex(e);
      } catch {
        return null;
      }
    })
  );

  return {
    localId: contact.localId,
    contact_name: contact.contact_name,
    phone_hashes: phone_hashes.filter(Boolean) as string[],
    email_hashes: email_hashes.filter(Boolean) as string[],
  };
}

function mapNativeContacts(data: Contacts.Contact[] | null) {
  if (!data) return [];
  return data.map((c: any) => {
    const phonesRaw = (c.phoneNumbers || []).map((p: any) => p.number || '');
    const emailsRaw = (c.emails || []).map((e: any) => e.email || '');
    const phonesNormalized = phonesRaw.map((p: string) => normalizePhoneToE164(p)).filter(Boolean);
    const emailsNormalized = emailsRaw.map((e: any) => (e || '').toLowerCase()).filter(Boolean);
    return {
      localId: c.id,
      contact_name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || null,
      rawPhones: phonesRaw,
      rawEmails: emailsRaw,
      phonesNormalized,
      emailsNormalized,
    };
  });
}

export function useContacts({ forceRefresh = false } = {}) {
  const queryClient = useQueryClient();
  const setAtom = useSetAtom(contactsAtom);
  const processingRef = useRef(false);
  const { accessToken: token } = useAccessToken();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (forceRefresh) return;
      const cached = await loadCacheFromStorage();
      if (mounted && cached) {
        queryClient.setQueryData<ContactDisplayItem[]>(['contacts'], cached);
        setAtom(cached);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [forceRefresh, queryClient, setAtom]);

  const query = useQuery<ContactDisplayItem[], Error>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Contacts permission denied');

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Image],
      });

      const mapped = mapNativeContacts(data || []);
      const displayItems: ContactDisplayItem[] = mapped.map((c) => ({
        localId: c.localId,
        contact_name: c.contact_name,
        rawPhones: c.rawPhones,
        rawEmails: c.rawEmails,
        matched: undefined,
      }));

      const contactsWithHashes = (
        await Promise.all(mapped.map((c) => buildHashesForContact(c)))
      ).filter((cc) => cc.phone_hashes.length + cc.email_hashes.length > 0);

      if (!contactsWithHashes.length) {
        await saveCacheToStorage(displayItems);
        return displayItems;
      }

      const batches = chunk(contactsWithHashes, BATCH_SIZE);
      const aggregatedMap = new Map<string, ContactDisplayItem>();
      for (const item of displayItems) aggregatedMap.set(item.localId, item);

      const limit = pLimit(CONCURRENCY);
      const processBatch = async (batch: typeof contactsWithHashes) => {
        try {
          const payload = batch.map((b) => ({
            localId: b.localId,
            contact_name: b.contact_name,
            phone_hashes: b.phone_hashes,
            email_hashes: b.email_hashes,
          }));
          if (!token) return;
          const { results } = await callContactsMatchHashedContacts(payload, { token });
          for (const r of results || []) {
            const cur =
              aggregatedMap.get(r.localId) ??
              ({
                localId: r.localId,
                contact_name: r.contact_name ?? null,
                rawPhones: [],
                rawEmails: [],
              } as ContactDisplayItem);

            aggregatedMap.set(r.localId, {
              ...cur,
              contact_name: r.contact_name ?? cur.contact_name,
              matched: !!r.matched,
              phoneMatched: !!r.phoneMatched,
              emailMatched: !!r.emailMatched,
              match_source: r.match_source ?? null,
              profile_id: r.profile_id ?? null,
              status: r.status ?? null,
              ambiguous: !!r.ambiguous,
              matched_profiles: r.matched_profiles ?? null,
            });
          }

          const mergedList = Array.from(aggregatedMap.values());
          queryClient.setQueryData<ContactDisplayItem[]>(['contacts'], mergedList);
          setAtom(mergedList);
        } catch (err) {
          console.error('[useContacts] batch error', err);
        }
      };

      processingRef.current = true;
      const promises = batches.map((b) => limit(() => processBatch(b)));
      await Promise.all(promises);
      processingRef.current = false;

      const finalList = Array.from(aggregatedMap.values());
      await saveCacheToStorage(finalList);
      return finalList;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    // onSuccess: (data: ContactDisplayItem[] | ((prev: ContactDisplayItem[] | null) => ContactDisplayItem[] | null) | null) => data && setAtom(data),
    // onError: (err: any) => console.error('[useContacts] query error', err),
  });

  const refresh = async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  return {
    ...query,
    contacts: query.data ?? null,
    refresh,
    processing: processingRef.current,
  };
}
