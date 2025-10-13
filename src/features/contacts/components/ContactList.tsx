// src/components/ContactList.tsx
import { useNavigation } from 'expo-router';
import { useAtomValue } from 'jotai';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, SectionList, Share, Text, View } from 'react-native';

import AppHeader from '@/components/AppHeader';
import ContactDetails from '@/features/contacts/components/ContactDetails';
import ContactRow from '@/features/contacts/components/ContactRow';
import type { InviteOption } from '@/features/contacts/components/InviteModal';
import InviteModal from '@/features/contacts/components/InviteModal';
import SearchBar from '@/features/contacts/components/SearchBar';
import useFriends from '@/features/contacts/hooks/useFriends';
import useGroupMutations from '@/features/contacts/hooks/useGroupMutations';
import usePhoneContacts from '@/hooks/usePhoneContacts';
import type { ContactItem as ContactItemType } from '@/stores/atoms/contacts';
import { selectedGroupAtom } from '@/stores/atoms/groups';
import { userAtom } from '@/stores/atoms/user';
import { sha256Hex } from '@/utils/hash';
import { formatPhoneInternational, normalizeEmail, normalizePhone } from '@/utils/normalise';

// ---------- small helpers ----------
const normalize = (s?: string) => (s || '').toLowerCase().trim();
const capitalize = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const useStatusMap = (selectedGroup?: any) =>
  useMemo(() => {
    const m = new Map<string, 'owner' | 'member' | undefined>();
    const ownerId = selectedGroup?.owner?.id ?? null;
    for (const mem of selectedGroup?.members ?? []) if (mem?.id) m.set(mem.id, 'member');
    if (ownerId) m.set(ownerId, 'owner');
    return m;
  }, [selectedGroup]);

// ---------- main component ----------
const ContactList: React.FC = () => {
  const { contacts: phoneContacts = [], loading: phoneLoading } = usePhoneContacts();
  const selectedGroup = useAtomValue(selectedGroupAtom);
  const user = useAtomValue(userAtom);
  const navigation = useNavigation();

  const [query, setQuery] = useState('');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteOptions, setInviteOptions] = useState<InviteOption[]>([]);
  const [selectedInviteOptionId, setSelectedInviteOptionId] = useState<string | null>(null);
  const [inviteLoadingLocal, setInviteLoadingLocal] = useState(false);
  const [inviteContactBeingInvited, setInviteContactBeingInvited] =
    useState<ContactItemType | null>(null);
  const [removingIds, setRemovingIds] = useState<string[]>([]);

  const {
    friends,
    isLoading: friendsLoading,
    isFetching,
    isError: friendsError,
    refetch,
  } = useFriends(user?.id);
  // --- mutations ---

  const { deleteMember, inviteMember, isDeleting, isInviting } = useGroupMutations();

  // --- layout header ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title={selectedGroup?.group_name ?? 'Contacts'} showBackButton />,
    });
  }, [navigation, selectedGroup?.group_name, isFetching]);

  // --- derived / memos ---
  const statusMap = useStatusMap(selectedGroup);

  const matchContact = (c: ContactItemType, q: string) => {
    if (!q) return true;
    const nq = normalize(q);
    const nameMatch = normalize(c.name ?? '').includes(nq);
    const emailMatch = (c.emails ?? []).some((e) => normalize(e).includes(nq));
    const phoneMatch = (c.phones ?? []).some(
      (p: any) => normalize(p.number).includes(nq) || (p.label && normalize(p.label).includes(nq))
    );
    return nameMatch || emailMatch || phoneMatch;
  };

  const mergedEvenContacts = useMemo(() => {
    const map = new Map<string, ContactItemType>();
    // add friends
    for (const f of friends) {
      const id = f.friend_id;
      if (!id || map.has(id)) continue;
      map.set(id, {
        id,
        name: f.nickname ?? undefined,
        emails: f.email ? [f.email] : [],
        phones: f.phone
          ? [{ id: String(f.friendship_id ?? `${id}-phone`), label: 'phone', number: f.phone }]
          : [],
      });
    }
    // add user
    if (user?.id && !map.has(user.id)) {
      map.set(user.id, {
        id: user.id,
        name: (user as any).nickname ?? (user as any).name ?? undefined,
        emails: (user as any).email ? [(user as any).email] : [],
        phones: (user as any).phone
          ? [{ id: `${user.id}-self`, label: 'phone', number: (user as any).phone }]
          : [],
      });
    }
    const all = Array.from(map.values());
    const byName = (a: ContactItemType, b: ContactItemType) => {
      const na = (a.name ?? '').trim().toLowerCase();
      const nb = (b.name ?? '').trim().toLowerCase();
      if (!na && !nb) return 0;
      if (!na) return 1;
      if (!nb) return -1;
      return na < nb ? -1 : na > nb ? 1 : 0;
    };
    const ownerBucket: ContactItemType[] = [];
    const memberBucket: ContactItemType[] = [];
    const nonMemberBucket: ContactItemType[] = [];
    for (const c of all) {
      const s = statusMap.get(c.id);
      if (s === 'owner') ownerBucket.push(c);
      else if (s === 'member') memberBucket.push(c);
      else nonMemberBucket.push(c);
    }
    ownerBucket.sort(byName);
    memberBucket.sort(byName);
    nonMemberBucket.sort(byName);
    return [...ownerBucket, ...memberBucket, ...nonMemberBucket];
  }, [friends, user, statusMap]);

  const filteredEven = useMemo(
    () => (query ? mergedEvenContacts.filter((c) => matchContact(c, query)) : mergedEvenContacts),
    [mergedEvenContacts, query]
  );
  const filteredPhone = useMemo(
    () =>
      query ? phoneContacts.filter((c: ContactItemType) => matchContact(c, query)) : phoneContacts,
    [phoneContacts, query]
  );

  const sections = [
    { title: 'From Even', data: filteredEven },
    { title: 'From Contacts', data: filteredPhone },
  ];

  // ---------- handlers ----------
  const handleRemove = async (contact: ContactItemType, isOwner = false) => {
    if (!selectedGroup?.id || !user?.id) {
      Alert.alert('Unable to remove', 'Group or user information missing');
      return;
    }
    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        isOwner ? 'Leave Group' : 'Remove member',
        isOwner
          ? `Are you sure you want to leave this group?`
          : `Are you sure you want to remove ${contact.name ?? 'this user'} from the group?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    });
    if (!confirm) return;
    setRemovingIds((prev) => [...prev, contact.id]);
    deleteMember({
      groupId: selectedGroup.id,
      memberId: contact.id,
      removedBy: user.id,
    });
  };

  const handleAddExisting = async (contact: ContactItemType) => {
    if (!selectedGroup?.id) {
      Alert.alert('Missing group', 'No group selected');
      return;
    }
    const email = contact.emails && contact.emails[0] ? normalizeEmail(contact.emails[0]) : null;
    const phone =
      contact.phones && contact.phones[0] ? normalizePhone(contact.phones[0].number) : null;
    const payload = {
      contact_name: contact.name ?? 'Unknown',
      invite_channel: phone ? 'app' : email ? 'email' : 'app',
      email,
      phone,
      type: 'existing' as const,
    };
    try {
      setInviteLoadingLocal(true);
      await inviteMember({ groupId: selectedGroup.id, payload });
      Alert.alert('Added', `${capitalize(contact.name)} added to group (existing).`);
    } catch (err: any) {
      Alert.alert('Add failed', err?.message ?? String(err));
    } finally {
      setInviteLoadingLocal(false);
    }
  };

  const computeExistingHashedSet = useCallback(async () => {
    const arr: string[] = [];
    for (const c of mergedEvenContacts) {
      for (const e of c.emails ?? []) {
        if (!e) continue;
        const n = normalizeEmail(e) ?? '';
        if (n) arr.push(n);
      }
      for (const p of c.phones ?? []) {
        if (!p?.number) continue;
        const n = normalizePhone(p.number) ?? '';
        if (n) arr.push(n);
      }
    }
    const hashedArr = await Promise.all(arr.map((x) => sha256Hex(x)));
    return new Set(hashedArr);
  }, [mergedEvenContacts]);

  const handleInviteStart = async (contact: ContactItemType) => {
    const hashedExistingSet = await computeExistingHashedSet();

    const candidates: { kind: 'phone' | 'email' | 'own'; raw: string; normalized: string }[] = [];
    for (const e of contact.emails ?? []) {
      if (!e) continue;
      const n = normalizeEmail(e) ?? '';
      candidates.push({ kind: 'email', raw: e, normalized: n });
    }
    for (const p of contact.phones ?? []) {
      if (!p?.number) continue;
      const n = normalizePhone(p.number) ?? '';
      candidates.push({ kind: 'phone', raw: p.number, normalized: n });
    }
    if (user && (user as any).phone) {
      const n = normalizePhone((user as any).phone) ?? '';
      candidates.push({ kind: 'own', raw: (user as any).phone, normalized: n });
    }
    if (candidates.length === 0) {
      Alert.alert('No contact methods', 'This contact has no phone or email to invite.');
      return;
    }

    const candidatesWithHash = await Promise.all(
      candidates.map(async (c) => ({ ...c, hash: await sha256Hex(c.normalized) }))
    );
    const matched = candidatesWithHash.filter((c) => hashedExistingSet.has(c.hash));
    const matchedHashes = new Set(matched.map((m) => m.hash));
    const allMatched = matched.length === candidatesWithHash.length;

    if (allMatched) {
      const matchedVal = matched[0].normalized;
      const found = mergedEvenContacts.find((mc) => {
        const emailsMatch = (mc.emails ?? []).some((e) => normalizeEmail(e) === matchedVal);
        const phonesMatch = (mc.phones ?? []).some((p) => normalizePhone(p.number) === matchedVal);
        return emailsMatch || phonesMatch;
      });

      const alreadyGroupMember = selectedGroup?.members.some((m) => m.id === found?.id);

      if (alreadyGroupMember) {
        Alert.alert(
          'Already in Group',
          `${contact.name ?? 'Contact'} is already a group member as ${found?.name}.`,
          [{ text: 'Ok', style: 'cancel' }]
        );
      } else {
        const confirm = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Already in app',
            `${contact.name ?? 'Contact'} is already in the app as ${found?.name ?? 'a member'}.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Add in group', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
        if (confirm) handleAddExisting(contact);
      }
      return;
    }

    const options: InviteOption[] = candidatesWithHash.map((c, idx) => ({
      id: `opt-${idx}`,
      label:
        c.kind === 'email'
          ? `Email: ${normalizeEmail(c.raw)}`
          : c.kind === 'phone'
            ? `Phone: ${formatPhoneInternational ? formatPhoneInternational(c.raw) : c.raw}`
            : `Use my number: ${formatPhoneInternational ? formatPhoneInternational(c.raw) : c.raw}`,
      kind: c.kind === 'own' ? 'own' : c.kind === 'email' ? 'email' : 'phone',
      raw: c.raw,
      disabled: matchedHashes.has(c.hash),
    }));

    setInviteOptions(options);
    const firstEnabled = options.find((o) => !o.disabled);
    setSelectedInviteOptionId(firstEnabled ? firstEnabled.id : (options[0]?.id ?? null));
    setInviteContactBeingInvited(contact);
    setInviteModalVisible(true);
  };

  const performInvite = async () => {
    if (!selectedInviteOptionId || !inviteContactBeingInvited) {
      Alert.alert('Select method', 'Please select a method to invite');
      return;
    }
    if (!selectedGroup?.id) {
      Alert.alert('Missing group', 'No group selected');
      return;
    }
    const opt = inviteOptions.find((o) => o.id === selectedInviteOptionId);
    if (!opt) {
      Alert.alert('Invalid option', 'Selected option not found');
      return;
    }

    setInviteLoadingLocal(true);
    try {
      const normalizedEmail = opt.kind === 'email' ? normalizeEmail(opt.raw) : null;
      const normalizedPhone =
        opt.kind === 'phone' || opt.kind === 'own' ? normalizePhone(opt.raw) : null;
      const invite_channel = opt.kind === 'email' ? 'email' : opt.kind === 'phone' ? 'sms' : 'app';

      const payload = {
        contact_name: inviteContactBeingInvited.name ?? 'Unknown',
        invite_channel: invite_channel as any,
        email: normalizedEmail,
        phone: normalizedPhone,
        type: 'new' as const,
      };

      const res = await inviteMember({ groupId: selectedGroup.id, payload });

      Alert.alert(
        'Invited',
        `We have added ${inviteContactBeingInvited.name ?? 'contact'} to the group.`,
        [
          { text: 'Ok', style: 'cancel' },
          {
            text: 'Share Invite',
            style: 'destructive',
            onPress: async () => {
              await Share.share({
                message: `${inviteContactBeingInvited.name || 'Friend'}, join my EvenUp group: ${res.inviteLink}`,
              });
            },
          },
        ]
      );
      setInviteModalVisible(false);
    } catch (err: any) {
      Alert.alert('Invite failed', err?.message ?? String(err));
    } finally {
      setInviteLoadingLocal(false);
    }
  };

  // ---------- render ----------
  return (
    <View className="flex-1 bg-white p-4">
      <SearchBar
        placeholder="Search by name, phone or email"
        value={query}
        onChangeText={setQuery}
        onSubmit={() => Keyboard.dismiss()}
      />

      {(phoneLoading || friendsLoading) && !friends.length ? (
        <View className="my-4 items-center">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-gray-500">Loading contacts…</Text>
        </View>
      ) : null}

      {friendsError ? (
        <View className="py-2">
          <Text className="text-sm text-red-600">Failed to load friends: {friendsError}</Text>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item: ContactItemType) => item.id}
        renderSectionHeader={({ section: { title, data } }) => (
          <View className="py-2">
            <Text className="text-sm font-semibold text-gray-600">
              {title} ({data.length})
            </Text>
          </View>
        )}
        renderItem={({ item, section }) => {
          const contact = item as ContactItemType;
          const isFromEven = section?.title === 'From Even';
          const role = statusMap.get(contact.id);
          const isOwner = role === 'owner';
          const isGroupMember = role === 'member';
          const isSelf = contact.id === user?.id;
          const badge = isOwner ? 'Group owner' : isGroupMember ? 'Group member' : undefined;
          const isRemoving = removingIds.includes(contact.id);

          return (
            <ContactRow
              contact={contact}
              isFromEven={isFromEven}
              badge={isFromEven ? badge : undefined}
              isOwner={isOwner}
              isSelf={isSelf}
              isGroupMember={isGroupMember}
              isRemoving={isRemoving}
              onRemove={() => handleRemove(contact, isOwner)}
              onAddExisting={() => handleAddExisting(contact)}
              onInvite={() => handleInviteStart(contact)}
              renderDetails={() => <ContactDetails item={contact} isOwner={isOwner} />}
            />
          );
        }}
        ListEmptyComponent={() => (
          <View className="items-center py-8">
            <Text className="text-sm text-gray-500">No contacts found.</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <InviteModal
        visible={inviteModalVisible}
        options={inviteOptions}
        selectedId={selectedInviteOptionId}
        setSelectedId={setSelectedInviteOptionId}
        loading={inviteLoadingLocal}
        onCancel={() => setInviteModalVisible(false)}
        onInvite={performInvite}
        title={`Invite ${inviteContactBeingInvited?.name ?? ''}`}
      />
    </View>
  );
};

export default ContactList;
