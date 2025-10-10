import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useAtomValue, useSetAtom } from 'jotai';
import pLimit from 'p-limit';
import { useEffect, useRef } from 'react';

import type { USER_STATUS } from '@/constant';
import { useAccessToken } from '@/hooks/useAccessToken';
import { callContactsMatchHashedContacts } from '@/services/contacts';
import { contactsAtom } from '@/stores/atoms/contacts';
import { sha256Hex } from '@/utils/hash';
import { normalizeEmail, normalizePhone } from '@/utils/normalise';

export type ContactDisplayItem = {
  localId: string;
  contact_name?: string | null;
  rawPhones?: string[]; // normalized phones
  rawEmails?: string[]; // normalized emails
  phone_hashes?: string[]; // sha256 hex
  email_hashes?: string[]; // sha256 hex
  matched?: boolean;
  phoneMatched?: boolean;
  emailMatched?: boolean;
  match_source?: 'phone' | 'email' | 'both' | null;
  profile_id?: string | null;
  status?: USER_STATUS | null;
  ambiguous?: boolean;
  matched_profiles?: any[] | null;
};

const BATCH_SIZE = 200;
const CONCURRENCY = 2;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours (tunable)

function mapAndNormalizeNativeContacts(data: Contacts.Contact[] | null) {
  if (!data || data.length === 0) return [];

  return data.map((c: any) => {
    const phonesRaw = (c.phoneNumbers || []).map((p: any) => p.number || '');
    const emailsRaw = (c.emails || []).map((e: any) => e.email || '');

    const phonesSet = new Set<string>();
    for (const p of phonesRaw) {
      const np = normalizePhone(p);
      if (np) phonesSet.add(np);
    }

    const emailsSet = new Set<string>();
    for (const e of emailsRaw) {
      const ne = normalizeEmail(e);
      if (ne) emailsSet.add(ne);
    }

    return {
      localId: c.id,
      contact_name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || null,
      phonesNormalized: Array.from(phonesSet),
      emailsNormalized: Array.from(emailsSet),
    };
  });
}

function mergeContactsByIdentifier(
  contacts: Array<{
    localId: string;
    contact_name?: string | null;
    phonesNormalized: string[];
    emailsNormalized: string[];
  }>
) {
  const masterMap = new Map<
    string,
    {
      localId: string;
      contact_name?: string | null;
      phones: Set<string>;
      emails: Set<string>;
    }
  >();
  const identifierMap = new Map<string, string>(); // identifier -> masterId

  const pid = (p: string) => `p:${p}`;
  const eid = (e: string) => `e:${e}`;

  for (const c of contacts) {
    if ((c.phonesNormalized?.length || 0) + (c.emailsNormalized?.length || 0) === 0) {
      continue;
    }

    let targetMasterId: string | null = null;
    for (const ph of c.phonesNormalized) {
      const existing = identifierMap.get(pid(ph));
      if (existing) {
        targetMasterId = existing;
        break;
      }
    }
    if (!targetMasterId) {
      for (const em of c.emailsNormalized) {
        const existing = identifierMap.get(eid(em));
        if (existing) {
          targetMasterId = existing;
          break;
        }
      }
    }

    if (!targetMasterId) {
      const masterId = c.localId;
      masterMap.set(masterId, {
        localId: masterId,
        contact_name: c.contact_name ?? null,
        phones: new Set(c.phonesNormalized),
        emails: new Set(c.emailsNormalized),
      });
      for (const ph of c.phonesNormalized) identifierMap.set(pid(ph), masterId);
      for (const em of c.emailsNormalized) identifierMap.set(eid(em), masterId);
    } else {
      let master = masterMap.get(targetMasterId);
      if (!master) {
        master = {
          localId: targetMasterId,
          contact_name: c.contact_name ?? null,
          phones: new Set(c.phonesNormalized),
          emails: new Set(c.emailsNormalized),
        };
        masterMap.set(targetMasterId, master);
      } else {
        if ((!master.contact_name || master.contact_name.length === 0) && c.contact_name) {
          master.contact_name = c.contact_name;
        }
        for (const ph of c.phonesNormalized) {
          master.phones.add(ph);
          identifierMap.set(pid(ph), master.localId);
        }
        for (const em of c.emailsNormalized) {
          master.emails.add(em);
          identifierMap.set(eid(em), master.localId);
        }
      }
    }
  }

  const out = [];
  for (const [, v] of masterMap.entries()) {
    out.push({
      localId: v.localId,
      contact_name: v.contact_name ?? null,
      phonesNormalized: Array.from(v.phones),
      emailsNormalized: Array.from(v.emails),
    });
  }
  return out;
}

async function buildHashesForContact(contact: {
  localId: string;
  contact_name?: string | null;
  phonesNormalized: string[];
  emailsNormalized: string[];
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
    contact_name: contact.contact_name ?? null,
    phonesNormalized: contact.phonesNormalized,
    emailsNormalized: contact.emailsNormalized,
    phone_hashes: phone_hashes.filter(Boolean) as string[],
    email_hashes: email_hashes.filter(Boolean) as string[],
  };
}

/**
 * useContacts hook with robust token check, streaming and softRefresh
 */
export function useContacts({ forceRefresh = false, enableDebug = true } = {}) {
  const queryClient = useQueryClient();
  const setAtom = useSetAtom(contactsAtom);
  const storedAtomData = useAtomValue(contactsAtom);
  const processingRef = useRef(false);

  // IMPORTANT: be explicit about token presence
  const { accessToken } = useAccessToken(); // keep original hook usage
  const token = accessToken as unknown; // keep type as-is
  const hasToken = typeof token === 'string' && token.trim().length > 0;

  const log = (...args: any[]) => {
    if (enableDebug) console.debug('[useContacts]', ...args);
  };

  log('fetchContacts START — hasToken:', hasToken);
  // canonical fetch function (same logic as earlier)
  const fetchContacts = async (): Promise<ContactDisplayItem[]> => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      log('Contacts permission status:', status);
      if (status !== 'granted') throw new Error('Contacts permission denied');

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Image],
      });
      log('Native contacts retrieved:', data?.length ?? 0);

      const normalized = mapAndNormalizeNativeContacts(data || []);
      log('Normalized contacts (per-contact deduped):', normalized.length);

      const withIdentifiers = normalized.filter(
        (c) => (c.phonesNormalized?.length || 0) + (c.emailsNormalized?.length || 0) > 0
      );
      log('Contacts with identifiers:', withIdentifiers.length);

      if (!withIdentifiers.length) {
        const emptyList: ContactDisplayItem[] = [];
        setAtom(emptyList);
        queryClient.setQueryData(['contacts'], emptyList);
        log('No identifiers — persisted empty list and returning');
        return emptyList;
      }

      const merged = mergeContactsByIdentifier(withIdentifiers);
      log('Merged contacts (identifier-level):', merged.length);

      processingRef.current = true;
      const withHashes = await Promise.all(merged.map((m) => buildHashesForContact(m)));
      processingRef.current = false;
      log('Built hashes for contacts:', withHashes.length);

      const contactsWithHashes = withHashes.filter(
        (c) => (c.phone_hashes?.length || 0) + (c.email_hashes?.length || 0) > 0
      );
      log('Contacts with at least one hash:', contactsWithHashes.length);

      if (!contactsWithHashes.length) {
        const emptyList: ContactDisplayItem[] = [];
        setAtom(emptyList);
        queryClient.setQueryData(['contacts'], emptyList);
        log('No hashes — persisted empty list and returning');
        return emptyList;
      }

      // baseline aggregatedMap so UI has immediate data
      const aggregatedMap = new Map<string, ContactDisplayItem>();
      for (const c of contactsWithHashes) {
        aggregatedMap.set(c.localId, {
          localId: c.localId,
          contact_name: c.contact_name ?? null,
          rawPhones: c.phonesNormalized,
          rawEmails: c.emailsNormalized,
          matched: undefined,
        });
      }
      const publishProgress = () => {
        const currentList = Array.from(aggregatedMap.values());
        setAtom(currentList);
        queryClient.setQueryData(['contacts'], currentList);
      };

      if (!hasToken) {
        log('hasToken=false — skipping API calls, persisting baseline');
        const baseline = Array.from(aggregatedMap.values());
        setAtom(baseline);
        queryClient.setQueryData(['contacts'], baseline);
        return baseline;
      }

      // batching + API calls
      const chunk = <T>(arr: T[], size: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };
      const batches = chunk(contactsWithHashes, BATCH_SIZE);
      log('API call batches:', batches.length, 'BATCH_SIZE:', BATCH_SIZE);

      const limit = pLimit(CONCURRENCY);
      const processBatch = async (batch: typeof contactsWithHashes, idx: number) => {
        try {
          log(`Calling API for batch ${idx + 1}/${batches.length} size=${batch.length}`);
          const payload = batch.map((b) => ({
            localId: b.localId,
            contact_name: b.contact_name,
            phone_hashes: b.phone_hashes,
            email_hashes: b.email_hashes,
          }));
          const { results } = await callContactsMatchHashedContacts(payload, {
            token: token as string,
          });
          log(`Batch ${idx + 1} API returned ${results?.length ?? 0} results`);

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
          publishProgress();
        } catch (err) {
          console.error('[useContacts] processBatch error', err);
          publishProgress();
        }
      };

      processingRef.current = true;
      const promises = batches.map((b, i) => limit(() => processBatch(b, i)));
      await Promise.all(promises);
      processingRef.current = false;

      const finalList = Array.from(aggregatedMap.values());
      setAtom(finalList);
      queryClient.setQueryData(['contacts'], finalList);

      log('fetchContacts DONE — finalList size:', finalList.length);
      return finalList;
    } catch (err) {
      log('fetchContacts ERROR:', err);
      throw err;
    }
  };

  // seed from persisted atom if present and not forcing refresh
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (forceRefresh) return;
      if (mounted && storedAtomData && Array.isArray(storedAtomData) && storedAtomData.length) {
        log('Seeding query cache from persisted atom — items:', storedAtomData.length);
        queryClient.setQueryData<ContactDisplayItem[]>(['contacts'], storedAtomData);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceRefresh, storedAtomData, queryClient]);

  // react-query useQuery using fetchContacts
  const query = useQuery<ContactDisplayItem[], Error>({
    queryKey: ['contacts'],
    queryFn: fetchContacts,
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // softRefresh explicitly calls fetchContacts via fetchQuery (keeps atom until new results arrive)
  const softRefresh = async (): Promise<ContactDisplayItem[] | undefined> => {
    log('softRefresh invoked — hasToken:', hasToken);
    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['contacts'],
        queryFn: fetchContacts,
      });
      log(
        'softRefresh completed, result size:',
        (result as ContactDisplayItem[] | undefined)?.length ?? 0
      );
      return result as ContactDisplayItem[] | undefined;
    } catch (err) {
      console.error('[useContacts] softRefresh error', err);
      return undefined;
    }
  };

  return {
    ...query,
    contacts: query.data ?? null,
    softRefresh,
    processing: processingRef.current,
  };
}
