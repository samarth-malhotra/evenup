// stores/atoms/contacts.ts (append or update)

import { STORAGE_KEYS } from '@/stores/storageKeys';
import { persistedAtom } from '@/stores/utils/persistedAtom';

// export const contactsAtom = atom<ContactDisplayItem[]>([]);
// export const processingIdsAtom = atom(null, (get, set, update) => {
//   // this write form used if you want to set via `setProcessingIds((prev)=>({...}))` from components
//   set(processingIdsAtom, typeof update === 'function' ? update(get(processingIdsAtom)) : update);
// });

export type ContactPhone = {
  id: string;
  label?: string | null;
  number: string;
  normalized?: string;
};

export type ContactItem = {
  id: string;
  name?: string | null;
  emails: string[];
  phones: ContactPhone[];
};
export const phoneContactsAtom = persistedAtom<ContactItem[]>(
  STORAGE_KEYS.PHONECONTACTLIST,
  [] as ContactItem[]
);
