// src/features/bills/components/AddBillSheet.tsx
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import ParticipantRow from '@/features/bills/components/common/ParticipantRow';
import { SPLIT_OPTIONS } from '@/features/bills/constant';
import { toNum } from '@/features/bills/utils';
import {
  useCreateGroupTransaction,
  useUpdateTransactionWithSplits,
} from '@/features/groups/hooks/transactions.mutations';
import type { GroupMember } from '@/features/groups/types';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';
import type { SplitMethod } from '@/types';

type Participant = { userId: string; amount: number };

type InitialTx = {
  id: string;
  title: string;
  amount: number;
  date?: string;
  paidBy?: string;
  participants?: Participant[];
  splitMethod?: SplitMethod;
  metadata?: any;
};

export default function AddBillSheet({
  open,
  onClose,
  onSaved,
  onSelectPaidBy,
  onSelectParticipants,
  members = [],
  mode = 'create',
  initial,
  groupId,
  groupName,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onSelectPaidBy?: () => Promise<string | undefined>;
  onSelectParticipants?: () => Promise<string[] | undefined>;
  members?: GroupMember[];
  mode?: 'create' | 'edit';
  initial?: InitialTx | null;
  groupId: string;
  groupName: string;
}) {
  const { theme } = useTheme();
  const currentUser = useAtomValue(userAtom);
  const createTx = useCreateGroupTransaction();
  const updateTxWithSplits = useUpdateTransactionWithSplits();

  // form state
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amountStr, setAmountStr] = useState(initial?.amount ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.date ? new Date(initial.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? currentUser?.id ?? '');
  const [participants, setParticipants] = useState<string[]>(
    initial?.participants?.map((p) => p.userId) ?? []
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(initial?.splitMethod ?? 'equal');

  const [exactMap, setExactMap] = useState<Record<string, string>>({});
  const [percentMap, setPercentMap] = useState<Record<string, string>>({});
  const [shareMap, setShareMap] = useState<Record<string, string>>({});

  // -------- NEW: internal fallback pickers --------
  const [showPaidByModal, setShowPaidByModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersSelection, setMembersSelection] = useState<Record<string, boolean>>({});

  const openInternalMembers = useCallback(() => {
    // prime selection map from current participants (or default include current user)
    const next: Record<string, boolean> = {};
    if (participants.length) {
      participants.forEach((id) => (next[id] = true));
    } else {
      members.forEach((m) => (next[m.id] = m.id === currentUser?.id));
    }
    setMembersSelection(next);
    setShowMembersModal(true);
  }, [participants, members, currentUser?.id]);

  const toggleMember = useCallback(
    (id: string) => setMembersSelection((s) => ({ ...s, [id]: !s[id] })),
    []
  );

  const confirmInternalMembers = useCallback(() => {
    const selected = Object.keys(membersSelection).filter((k) => membersSelection[k]);
    setParticipants(selected);
    setShowMembersModal(false);
  }, [membersSelection]);

  // initialize from initial tx when it changes (edit mode)
  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title ?? '');
    setAmountStr(initial.amount ? String(initial.amount) : '');
    setDate(initial.date ? new Date(initial.date) : new Date());
    setPaidBy(initial.paidBy ?? currentUser?.id ?? '');
    setParticipants(initial.participants?.map((p) => p.userId) ?? []);
    setSplitMethod(initial.splitMethod ?? 'equal');

    // fill per-person maps
    const e: Record<string, string> = {};
    const p: Record<string, string> = {};
    const s: Record<string, string> = {};
    if (initial.participants?.length) {
      initial.participants.forEach((part) => {
        e[part.userId] = String(part.amount ?? '0');
        p[part.userId] = initial.amount
          ? String(((part.amount / initial.amount) * 100).toFixed(2))
          : '0';
        s[part.userId] = '1';
      });
    }
    setExactMap(e);
    setPercentMap(p);
    setShareMap(s);
  }, [initial, currentUser?.id]);

  const amount = useMemo(() => {
    const n = Number(amountStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const equalPerPerson = useMemo(
    () => (amount && participants.length ? amount / participants.length : 0),
    [amount, participants.length]
  );

  // ensure maps have entries for participants
  useEffect(() => {
    if (!participants.length) return;
    if (splitMethod === 'exact') {
      setExactMap((prev) => {
        const next = { ...prev };
        participants.forEach((pId) => {
          if (next[pId] == null) next[pId] = equalPerPerson ? equalPerPerson.toFixed(2) : '0';
        });
        Object.keys(next).forEach((k) => !participants.includes(k) && delete next[k]);
        return next;
      });
    } else if (splitMethod === 'percent') {
      const eqp = participants.length ? 100 / participants.length : 0;
      setPercentMap((prev) => {
        const next = { ...prev };
        participants.forEach((pId) => {
          if (next[pId] == null) next[pId] = eqp ? eqp.toFixed(2) : '0';
        });
        Object.keys(next).forEach((k) => !participants.includes(k) && delete next[k]);
        return next;
      });
    } else if (splitMethod === 'shares') {
      setShareMap((prev) => {
        const next = { ...prev };
        participants.forEach((pId) => {
          if (next[pId] == null) next[pId] = '1';
        });
        Object.keys(next).forEach((k) => !participants.includes(k) && delete next[k]);
        return next;
      });
    }
  }, [participants, splitMethod, amount, equalPerPerson]);

  const exactSum = participants.reduce((s, p) => s + toNum(exactMap[p] || '0'), 0);
  const percentSum = participants.reduce((s, p) => s + toNum(percentMap[p] || '0'), 0);
  const totalShares = participants.reduce((s, p) => s + toNum(shareMap[p] || '0'), 0);

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (splitMethod === 'percent') {
      if (percentSum > 100 + 1e-6) w.push('Percentages exceed 100%.');
      else if (amount && Math.abs(percentSum - 100) > 1e-2)
        w.push('Percentages should total 100%.');
    } else if (splitMethod === 'exact') {
      if (exactSum > amount + 1e-6) w.push('Split total exceeds bill amount.');
      else if (amount && Math.abs(exactSum - amount) > 1e-2)
        w.push('Split total does not equal bill amount.');
    } else if (splitMethod === 'shares') {
      const splitSum =
        totalShares > 0
          ? participants.reduce((s, p) => s + (amount * toNum(shareMap[p] || '0')) / totalShares, 0)
          : 0;
      if (splitSum > amount + 1e-6) w.push('Split total exceeds bill amount.');
    }
    return w;
  }, [splitMethod, percentSum, exactSum, amount, participants, shareMap, totalShares]);

  const onChangeExact = useCallback(
    (id: string, v: string) => setExactMap((m) => ({ ...m, [id]: v })),
    []
  );
  const onChangePercent = useCallback(
    (id: string, v: string) => setPercentMap((m) => ({ ...m, [id]: v })),
    []
  );
  const onChangeShare = useCallback(
    (id: string, v: string) => setShareMap((m) => ({ ...m, [id]: v })),
    []
  );

  const handlePaidByPress = useCallback(async () => {
    if (onSelectPaidBy) {
      const res = await onSelectPaidBy();
      if (typeof res === 'string') setPaidBy(res);
    } else {
      setShowPaidByModal(true); // fallback modal
    }
  }, [onSelectPaidBy]);

  const handleParticipantsPress = useCallback(async () => {
    if (onSelectParticipants) {
      const res = await onSelectParticipants();
      if (Array.isArray(res)) setParticipants(res);
    } else {
      openInternalMembers(); // fallback modal
    }
  }, [onSelectParticipants, openInternalMembers]);

  const perPersonFinal = useMemo(() => {
    const out: Record<string, number> = {};
    if (splitMethod === 'equal') participants.forEach((p) => (out[p] = equalPerPerson || 0));
    else if (splitMethod === 'exact')
      participants.forEach((p) => (out[p] = toNum(exactMap[p] || '0')));
    else if (splitMethod === 'percent')
      participants.forEach((p) => (out[p] = amount * (toNum(percentMap[p] || '0') / 100)));
    else
      participants.forEach((p) => {
        const sh = toNum(shareMap[p] || '0');
        out[p] = totalShares > 0 ? (amount * sh) / totalShares : 0;
      });
    return out;
  }, [
    participants,
    splitMethod,
    equalPerPerson,
    exactMap,
    percentMap,
    amount,
    shareMap,
    totalShares,
  ]);

  const handleSave = async () => {
    if (!title.trim() || !amount || !paidBy || participants.length === 0) {
      console.warn('Please fill Title, Amount, Paid by and Participants.');
      return;
    }
    const hardError =
      (splitMethod === 'percent' && percentSum > 100 + 1e-6) ||
      (splitMethod === 'exact' && exactSum > amount + 1e-6);
    if (hardError) return;

    const splits = participants.map((id) => ({
      userId: id,
      amount: Number((perPersonFinal[id] ?? 0).toFixed(2)),
      shareType: splitMethod === 'percent' ? 'percent' : 'exact',
      shareMeta: splitMethod === 'percent' ? { percent: percentMap[id] } : {},
    }));

    try {
      if (mode === 'create') {
        await createTx.mutateAsync({
          title: title.trim(),
          amount,
          currency: 'INR',
          paidBy,
          groupId: groupId,
          createdBy: currentUser?.id ?? '',
          metadata: { splitMethod },
          splits,
          groupName: groupName,
        });
      }
      if (mode === 'edit' && initial?.id) {
        await updateTxWithSplits.mutateAsync({
          txId: initial.id,
          payload: {
            title: title.trim(),
            amount,
            currency: 'INR',
            paidBy,
            metadata: { splitMethod },
            splits,
          },
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      // hooks show toasts on error
      console.error(err);
    }
  };

  const getMemberLabel = (id?: string) => {
    if (!id) return 'Select person';
    if (id === currentUser?.id) return 'You';
    return members?.find((m) => m.id === id)?.name ?? id;
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <Text
          style={{ color: theme.colors.textPrimary }}
          className="mb-2 text-center text-lg font-semibold">
          {mode === 'create' ? 'Add Bills' : 'Edit Bill'}
        </Text>

        {/* Title */}
        <View className="mb-3 flex-row items-center">
          <Text
            style={{ color: theme.colors.textSecondary }}
            className="w-28 pr-3 text-sm font-medium">
            Title
          </Text>
          <View className="flex-1">
            <View
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
              className="h-11 rounded-xl border px-4">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Dinner"
                placeholderTextColor={theme.colors.placeholder}
                style={{ color: theme.colors.textPrimary }}
                className="h-11 text-base"
              />
            </View>
          </View>
        </View>

        {/* Amount */}
        <View className="mb-3 flex-row items-center">
          <Text
            style={{ color: theme.colors.textSecondary }}
            className="w-28 pr-3 text-sm font-medium">
            Amount
          </Text>
          <View className="flex-1">
            <View
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
              className="h-11 flex-row items-center rounded-xl border px-3">
              <Text style={{ color: theme.colors.textSecondary }} className="mr-2">
                ₹
              </Text>
              <TextInput
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.placeholder}
                style={{ color: theme.colors.textPrimary }}
                className="h-11 flex-1 text-base"
              />
            </View>
          </View>
        </View>

        {/* Date */}
        <View className="mb-3 flex-row items-center">
          <Text
            style={{ color: theme.colors.textSecondary }}
            className="w-28 pr-3 text-sm font-medium">
            Date
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
            className="h-11 flex-1 flex-row items-center justify-between rounded-xl border px-4">
            <Text style={{ color: theme.colors.textPrimary }} className="text-base">
              {dayjs(date).format('DD MMM YYYY')}
            </Text>
            <MaterialIcons
              name="calendar-today"
              size={20}
              style={{ color: theme.colors.textSecondary }}
            />
          </Pressable>
        </View>
        {showDatePicker && (
          <View className="mb-2">
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              onChange={(e, s) => {
                setShowDatePicker(false);
                if (s) setDate(s);
              }}
            />
          </View>
        )}

        {/* Paid by */}
        <View className="mb-3 flex-row items-center">
          <Text
            style={{ color: theme.colors.textSecondary }}
            className="w-28 pr-3 text-sm font-medium">
            Paid by
          </Text>
          <Pressable
            onPress={handlePaidByPress}
            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
            className="h-11 flex-1 flex-row items-center justify-between rounded-xl border px-4">
            <Text
              style={{ color: paidBy ? theme.colors.textPrimary : theme.colors.textSecondary }}
              className="text-base">
              {getMemberLabel(paidBy)}
            </Text>
            <MaterialIcons
              name="expand-more"
              size={24}
              style={{ color: theme.colors.textSecondary }}
            />
          </Pressable>
        </View>

        {/* People */}
        <View className="mb-3 flex-row items-center">
          <Text
            style={{ color: theme.colors.textSecondary }}
            className="w-28 pr-3 text-sm font-medium">
            People
          </Text>
          <Pressable
            onPress={handleParticipantsPress}
            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
            className="h-11 flex-1 flex-row items-center justify-between rounded-xl border px-4">
            <Text
              style={{
                color: participants.length ? theme.colors.textPrimary : theme.colors.textSecondary,
              }}
              className="text-base">
              {participants.length ? `${participants.length} selected` : 'Select members'}
            </Text>
            <MaterialIcons
              name="group-add"
              size={22}
              style={{ color: theme.colors.textSecondary }}
            />
          </Pressable>
        </View>

        {/* Split selector */}
        <View className="mb-2 flex-row items-center">
          <Text
            style={{ color: theme.colors.textSecondary }}
            className="w-28 pr-3 text-sm font-medium">
            Split
          </Text>
          <View className="flex-1 flex-row flex-wrap gap-2">
            {SPLIT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setSplitMethod(opt.key as SplitMethod)}
                className={`rounded-full px-3 py-2 ${splitMethod === opt.key ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                <Text
                  className={`text-sm ${splitMethod === opt.key ? 'font-semibold text-white' : 'text-gray-800'}`}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Participant list */}
        {participants.length > 0 && (
          <View style={{ backgroundColor: theme.colors.gray50 }} className="mt-2 rounded-2xl p-3">
            {participants.map((id) => (
              <View key={id}>
                <ParticipantRow
                  member={members.find((el) => el.id === id)}
                  mode={splitMethod}
                  amount={amount}
                  equalPerPerson={equalPerPerson}
                  exactStr={exactMap[id] ?? ''}
                  percentStr={percentMap[id] ?? ''}
                  shareStr={shareMap[id] ?? ''}
                  totalShares={totalShares}
                  onChangeExact={onChangeExact}
                  onChangePercent={onChangePercent}
                  onChangeShare={onChangeShare}
                />
              </View>
            ))}
          </View>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={{ backgroundColor: theme.colors.warning50 }} className="mt-3 rounded-xl p-3">
            {warnings.map((w, i) => (
              <Text key={i} style={{ color: theme.colors.warning800 }} className="text-xs">
                • {w}
              </Text>
            ))}
          </View>
        )}

        {/* Save */}
        <View className="pt-3">
          <TouchableOpacity
            onPress={handleSave}
            style={{ backgroundColor: theme.colors.link }}
            className="rounded-full py-4 shadow-lg">
            <Text
              style={{ color: theme.colors.textWhite }}
              className="text-center text-lg font-semibold">
              {mode === 'create' ? 'Save Bill' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* -------- Fallback PaidBy Modal -------- */}
      <Modal
        visible={showPaidByModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaidByModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold">Select payer</Text>
            <FlatList
              data={members}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setPaidBy(item.id);
                    setShowPaidByModal(false);
                  }}
                  className="border-b border-gray-100 py-3">
                  <Text className="text-base">
                    {item.id === currentUser?.id ? 'You' : item.name}
                  </Text>
                  {item.email && <Text className="text-xs text-gray-500">{item.email}</Text>}
                </Pressable>
              )}
            />
            <Pressable
              onPress={() => setShowPaidByModal(false)}
              className="mt-2 self-end px-4 py-2">
              <Text className="text-base text-gray-600">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* -------- Fallback Members Modal -------- */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMembersModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-3 text-lg font-semibold">Select participants</Text>
            <FlatList
              data={members}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => {
                const checked = !!membersSelection[item.id];
                return (
                  <Pressable
                    onPress={() => toggleMember(item.id)}
                    className="flex-row items-center justify-between border-b border-gray-100 py-3">
                    <View>
                      <Text className="text-base">
                        {item.id === currentUser?.id ? 'You' : item.name}
                      </Text>
                      {item.email && <Text className="text-xs text-gray-500">{item.email}</Text>}
                    </View>
                    <Text>{checked ? '✓' : ''}</Text>
                  </Pressable>
                );
              }}
            />
            <View className="mt-3 flex-row justify-end">
              <Pressable onPress={() => setShowMembersModal(false)} className="mr-2 px-4 py-2">
                <Text className="text-base text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmInternalMembers}
                className="rounded bg-indigo-600 px-4 py-2">
                <Text className="text-white">Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
