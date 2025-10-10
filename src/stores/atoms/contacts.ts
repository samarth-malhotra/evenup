// stores/atoms/contacts.ts (append or update)
import { atom } from 'jotai';

import type { ContactDisplayItem } from '@/hooks/useContacts';

export const contactsAtom = atom<ContactDisplayItem[]>([]);
export const processingIdsAtom = atom(null, (get, set, update) => {
  // this write form used if you want to set via `setProcessingIds((prev)=>({...}))` from components
  set(processingIdsAtom, typeof update === 'function' ? update(get(processingIdsAtom)) : update);
});
