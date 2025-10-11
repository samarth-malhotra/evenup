// src/screens/ContactList.tsx
import { useNavigation, useRouter } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '@/components/AppHeader';
import InviteModal from '@/components/InviteModal';
import { USER_STATUS } from '@/constant';
import type { ContactDisplayItem } from '@/hooks/useContacts';
import { useContacts } from '@/hooks/useContacts';
import { supabase } from '@/services/supabase';
import { contactsAtom } from '@/stores/atoms/contacts';
import {
  addGroupMemberAtom,
  selectedGroupIdAtom,
  selectedGroupMembersAtom,
} from '@/stores/atoms/groups';
import { formatPhoneInternational } from '@/utils/normalise';

const CACHE_KEY = 'evenup:contacts:matched:v2';
// const API_BASE = process.env.EXPO_PUBLIC_API_BASE || ''; // e.g. https://api.yoursvc.com
// const EDGE_BASE = (process.env.EXPO_PUBLIC_SUPABASE_EDGE_URL || '').replace(/\/$/, '');
export type GroupInvitePayloadType = {
  /** Raw phone number (unhashed). Optional if email provided. */
  phone?: string;

  /** Raw email address (unhashed). Optional if phone provided. */
  email?: string;

  /** How this invite should behave:
   * - "new": Always create a placeholder user.
   * - "existing": Try to find an existing user by phone/email hash.
   */
  type: 'new' | 'existing';

  /** Channel used for sending invite — e.g., "whatsapp", "sms", "email". */
  invite_channel?: 'whatsapp' | 'sms' | 'email' | 'app' | 'other';

  /** Optional name from phonebook/contact list. */
  contact_name?: string;
};
export default function ContactListScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  // const params = useLocalSearchParams();
  const contactItems = useAtomValue(contactsAtom);
  const groupId = useAtomValue(selectedGroupIdAtom);
  const groupMember = useAtomValue(selectedGroupMembersAtom);
  const addMember = useSetAtom(addGroupMemberAtom);
  const groupMemberUserIds = useMemo(() => groupMember.map((item) => item.id), [groupMember]);
  // const groupId = (params?.groupId as string) || (params?.group_id as string) || undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Add Members" showBackButton />,
    });
  }, [navigation]);

  // contacts hook
  const {
    isLoading: loading,
    error,
    // contacts: contactItems,
    softRefresh,
  } = useContacts({ forceRefresh: false });

  // local state for search + invite modal
  const [query, setQuery] = useState('');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteContact, setInviteContact] = useState<ContactDisplayItem | null>(null);
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});

  // Build sections: On EvenUp (matched true) and Invite (matched false)
  const sections = useMemo(() => {
    const onEvenUp = contactItems.filter((c) => c.matched);
    const invite = contactItems.filter((c) => !c.matched);
    return [
      { title: 'On EvenUp', data: onEvenUp },
      { title: 'Invite', data: invite },
    ];
  }, [contactItems]);

  console.log('in contact page: ', groupMemberUserIds);
  console.log('in contactItems: ', contactItems.length);
  // console.log('in contact list: ', contactItems[10]?.contact_name, contactItems[10]?.rawPhones);
  // helper to update a single contact in local UI + cache
  // async function upsertContactLocal(item: Partial<ContactDisplayItem> & { localId: string }) {
  //   try {
  //     const next = (contactItems || []).map((c) =>
  //       c.localId === item.localId ? { ...c, ...item } : c
  //     );
  //     // update UI by forcing a refresh from cache: easiest is to write cache and call refresh() to reload hook
  //     await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: next }));
  //     // call refresh so hook reads updated cache (useContacts will also attempt to match in background)
  //     await refresh();
  //   } catch (err) {
  //     console.warn('upsertContactLocal error', err);
  //   }
  // }

  // Add existing matched user to group
  // Replace your existing addExistingUserToGroup with this:
  async function addExistingUserToGroup(profileName: string, localId: string) {
    if (!groupId) {
      Alert.alert('No group id', 'Missing group id to add member.');
      return;
    }

    setProcessingIds((s) => ({ ...s, [localId]: true }));

    try {
      // get current session token
      const sessionResp = await supabase.auth.getSession();
      const token = sessionResp?.data?.session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      // find contact in local contactItems to extract phone/email/contact_name
      const contact = (contactItems || []).find((c) => c.localId === localId);
      if (!contact) {
        throw new Error('Contact not found locally');
      }

      // build function base URL (use environment override if present)
      // Use your published edge function root. Fallback to the URL you gave.
      const FUNCTION_ROOT = 'https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/groups-invite';

      // The Deno function expects a path like /groups/:id/invite,
      // so we call the function root + /groups/<groupId>/invite
      const fnUrl = `${FUNCTION_ROOT.replace(/\/$/, '')}/groups/${groupId}/invite`;

      // Build body. Only include fields you have. The edge fn requires email or phone.
      const body: GroupInvitePayloadType = {
        type: 'existing',
        contact_name: contact.contact_name ?? '',
        invite_channel: 'app', // or whatsapp/email based on UI
      };
      // prefer phone then email if available
      if (contact.rawPhones && contact.rawPhones.length > 0) {
        body.phone = contact.rawPhones[0];
      } else if (contact.rawEmails && contact.rawEmails.length > 0) {
        // body.email_hash = await sha256Hex(contact.rawEmails[0].toLowerCase());
        body.email = contact.rawEmails[0].toLowerCase();
      } else {
        throw new Error('Contact has neither phone nor email');
      }
      console.log('body:', body);

      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const text = await resp.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (e) {
        // not JSON — keep raw text
      }
      console.log('response: ', json);
      if (!resp.ok) {
        // try to include server message
        const serverMsg = (json && (json.error || json.message)) || text || resp.statusText;
        throw new Error(`Invite failed: ${serverMsg}`);
      }
      // expected response from your edge fn: { inviteLink, friend_profile_id }
      const friendProfileId = json?.friend_profile_id ?? json?.friend_profile_id?.toString?.();
      addMember({
        groupId: groupId,
        payload: {
          id: friendProfileId,
          name: profileName,
          phone_hash: '',
          email_hash: '',
          status: USER_STATUS.ACTIVE,
        },
      });
      console.log('atom payload: ', groupId, friendProfileId);

      // optimistic UI update: mark contact matched/invited and store profile_id
      // await upsertContactLocal({
      //   localId,
      //   matched: true,
      //   status: 'invited',
      //   profile_id: friendProfileId ?? null,
      // });
      //
      console.log('object', groupId);
      // optionally open share sheet using inviteLink if present
      if (json?.inviteLink) {
        // you can present a share sheet here using Expo Share or Linking.openURL
        // Example (uncomment if you want): await Share.share({ url: json.inviteLink });
      }

      Alert.alert('Invite created', 'Invite link created and user added (placeholder).');
      // navigate back to group or refresh group screen
      router.replace(`/(tabs)/groups/${groupId}`);
    } catch (err: any) {
      console.error('addExistingUserToGroup (edge invite) error', err);
      Alert.alert('Invite failed', err?.message ?? String(err));
    } finally {
      setProcessingIds((s) => {
        const copy = { ...s };
        delete copy[localId];
        return copy;
      });
    }
  }

  // Open invite modal for unmatched contact
  function openInvite(contact: ContactDisplayItem) {
    console.log('contact modal: ', contact);
    setInviteContact(contact);
    setInviteVisible(true);
  }

  // Handler after invite modal completes (we assume InviteModal will call server groups-invite)
  async function onInviteComplete(result: any, contactLocalId: string) {
    // result expected to contain inviteLink and friend_profile_id (based on your edge function)
    try {
      const friendProfileId = result?.friend_profile_id ?? result?.friend_profile_id?.toString?.();
      // optimistic update: mark as invited
      // await upsertContactLocal({
      //   localId: contactLocalId,
      //   matched: true,
      //   status: result?.status ?? 'invited',
      //   profile_id: friendProfileId ?? null,
      // });
      // add
      // const friendProfileId = json?.friend_profile_id ?? json?.friend_profile_id?.toString?.();
      addMember({
        groupId: groupId ?? '',
        payload: {
          id: friendProfileId,
          name: inviteContact?.contact_name ?? '',
          phone_hash: '',
          email_hash: '',
          status: USER_STATUS.INVITED,
        },
      });
      console.log('updated group member payload: ', {
        groupId: groupId ?? '',
        memberId: friendProfileId,
        payload: {
          id: friendProfileId,
          name: inviteContact?.contact_name ?? '',
          phone_hash: '',
          email_hash: '',
          status: USER_STATUS.INVITED,
        },
      });
      Alert.alert('Invite sent', 'Invite link created and share sheet opened.');
    } catch (err) {
      console.warn('onInviteComplete error', err);
    } finally {
      setInviteVisible(false);
      setInviteContact(null);
    }
  }

  // Render row
  function renderRow({ item }: { item: ContactDisplayItem }) {
    const name = item.contact_name || 'Unknown';
    const subtitle =
      formatPhoneInternational(item.rawPhones?.[0] ?? '') ?? item.rawEmails?.[0] ?? '';
    const isProcessing = Boolean(processingIds[item.localId]);
    const showAdd =
      !!item.matched &&
      item.profile_id &&
      (item.status === 'active' || item.status === null || item.status === undefined);
    const showPending = !!item.matched && item.status && item.status !== 'active';
    const showInvite = !item.matched;

    const showRemove = groupMemberUserIds.includes(item.profile_id ?? '');

    console.log('show contact: ', item.profile_id, item.contact_name, item.matched);

    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {item.ambiguous ? (
            <Text style={styles.ambig}>Multiple matches — tap to resolve</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {isProcessing ? (
            <ActivityIndicator size="small" />
          ) : showRemove ? (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => console.log('remove')}>
              <Text style={styles.inviteText}>Remove</Text>
            </TouchableOpacity>
          ) : showAdd ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addExistingUserToGroup(item.contact_name as string, item.localId)}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          ) : showPending ? (
            <TouchableOpacity style={styles.pendingBtn} onPress={() => openInvite(item)}>
              <Text style={styles.pendingText}>
                {item.status === 'invited' ? 'Invited' : item.status}
              </Text>
            </TouchableOpacity>
          ) : showInvite ? (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => openInvite(item)}>
              <Text style={styles.inviteText}>Invite</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.dummy}>—</Text>
          )}
        </View>
      </View>
    );
  }

  // Section header
  function renderSectionHeader({ section }: { section: any }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    );
  }

  // Search filter
  const filteredSections = useMemo(() => {
    if (!query) return sections.map((s) => ({ ...s, data: s.data }));
    const q = query.toLowerCase();
    return sections.map((s) => ({
      ...s,
      data: s.data.filter((item: ContactDisplayItem) => {
        const t = (
          item.contact_name ||
          item.rawPhones?.[0] ||
          item.rawEmails?.[0] ||
          ''
        ).toLowerCase();
        return t.includes(q);
      }),
    }));
  }, [sections, query]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  async function onPullToRefresh() {
    try {
      setIsRefreshing(true);
      await softRefresh(); // calls your hook’s refresh()
    } catch (err) {
      console.warn('Pull-to-refresh error', err);
    } finally {
      setIsRefreshing(false);
    }
  }

  // Main UI
  if (loading && (!contactItems || contactItems.length === 0)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: 'red' }}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search name, phone or email"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
      </View>

      <SectionList
        sections={filteredSections}
        keyExtractor={(item: ContactDisplayItem) => item.localId}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={() => (
          <View style={{ padding: 20 }}>
            <Text>No contacts found</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onPullToRefresh}
            tintColor="#0b74ff" // iOS spinner color
            colors={['#0b74ff']} // Android spinner color
            title="Refreshing contacts…" // optional label
          />
        }
      />

      <InviteModal
        visible={inviteVisible}
        onClose={() => {
          setInviteVisible(false);
          setInviteContact(null);
        }}
        groupId={groupId ?? ''}
        contact={{
          contact_name: inviteContact?.contact_name ?? '',
          phones: inviteContact?.rawPhones ?? [],
          emails: inviteContact?.rawEmails ?? [],
        }}
        onInvited={(result) => {
          // result should be the edge function response
          if (inviteContact) onInviteComplete(result, inviteContact.localId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { padding: 12 },
  searchInput: { backgroundColor: '#f2f2f2', padding: 8, borderRadius: 8 },
  sectionHeader: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  sectionTitle: { fontWeight: '700' },
  row: {
    padding: 12,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  ambig: { fontSize: 11, color: '#a00', marginTop: 4 },
  actions: { marginLeft: 12, justifyContent: 'center' },
  addBtn: {
    backgroundColor: '#0b74ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addText: { color: '#fff', fontWeight: '600' },
  inviteBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0b74ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inviteText: { color: '#0b74ff', fontWeight: '600' },
  pendingBtn: {
    backgroundColor: '#ffd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pendingText: { color: '#666', fontWeight: '600' },
  dummy: { color: '#999' },
});
