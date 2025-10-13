// features/bills/components/AddBillSheet.tsx
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import ParticipantRow from '@/features/bills/components/common/ParticipantRow';
import { SPLIT_OPTIONS } from '@/features/bills/constant';
import { toNum } from '@/features/bills/utils';
import { selectedGroupMembersAtom } from '@/stores/atoms/groups';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';
import type { SplitMethod } from '@/types';

const Pill = memo(function Pill({
  active,
  onPress,
  children,
}: {
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-2 ${active ? 'bg-indigo-600' : 'bg-gray-100'}`}>
      <Text className={`text-sm ${active ? 'font-semibold text-white' : 'text-gray-800'}`}>
        {children}
      </Text>
    </Pressable>
  );
});

export default function AddBillSheet({
  open,
  onClose,
  onSave,
  onSelectPaidBy,
  onSelectParticipants,
}: {
  open: boolean;
  onClose: () => void;
  onSave?: (p: {
    title: string;
    amount: number;
    date: Date;
    paidBy: string;
    participants: string[];
    splitMethod: SplitMethod;
    perPerson: Record<string, number>;
  }) => void;
  onSelectPaidBy?: () => Promise<string> | string | void;
  onSelectParticipants?: () => Promise<string[]> | string[] | void;
}) {
  const { theme } = useTheme();
  const groupMembers = useAtomValue(selectedGroupMembersAtom) as Array<any> | undefined;
  const user = useAtomValue(userAtom) as { id?: string } | undefined;

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paidBy, setPaidBy] = useState(''); // stores member id
  const [participants, setParticipants] = useState<string[]>([]); // array of member ids
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');

  const [exactMap, setExactMap] = useState<Record<string, string>>({});
  const [percentMap, setPercentMap] = useState<Record<string, string>>({});
  const [shareMap, setShareMap] = useState<Record<string, string>>({});

  const amount = useMemo(() => {
    const n = Number(amountStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const equalPerPerson = useMemo(
    () => (amount && participants.length ? amount / participants.length : 0),
    [amount, participants.length]
  );

  // build a quick id -> member map for fast lookup
  const membersMap = useMemo(() => {
    const m: Record<string, any> = {};
    (groupMembers || []).forEach((gm: any) => {
      if (gm && gm.id) m[gm.id] = gm;
    });
    return m;
  }, [groupMembers]);

  // Helper: resolve display name for an id (shows "You" if logged-in user)
  const getDisplayName = useCallback(
    (id?: string) => {
      if (!id) return '';
      if (user?.id && id === user.id) return 'You';

      const gm = membersMap[id];

      const possible =
        gm?.name ??
        gm?.nickname ??
        gm?.display_name ??
        gm?.label ??
        gm?.full_name ??
        gm?.user_name ??
        gm?.email ??
        gm?.phone ??
        null;

      if (possible) return String(possible);

      return id; // fallback to id (or '' if you'd rather hide it)
    },
    [membersMap, user?.id]
  );

  // Debugging: uncomment to inspect groupMembers shape and membersMap keys
  // useEffect(() => {
  //   console.log('groupMembers =>', JSON.stringify(groupMembers, null, 2));
  //   console.log('membersMap keys =>', Object.keys(membersMap).slice(0, 50));
  // }, [groupMembers, membersMap]);

  // Prefill logic (unchanged)
  useEffect(() => {
    if (!participants.length) return;
    if (splitMethod === 'exact') {
      const eq = participants.length ? amount / participants.length : 0;
      setExactMap((prev) => {
        const next = { ...prev };
        participants.forEach((p) => {
          if (next[p] == null) next[p] = eq ? eq.toFixed(2) : '0';
        });
        Object.keys(next).forEach((k) => !participants.includes(k) && delete next[k]);
        return next;
      });
    } else if (splitMethod === 'percent') {
      const eqp = participants.length ? 100 / participants.length : 0;
      setPercentMap((prev) => {
        const next = { ...prev };
        participants.forEach((p) => {
          if (next[p] == null) next[p] = eqp ? eqp.toFixed(2) : '0';
        });
        Object.keys(next).forEach((k) => !participants.includes(k) && delete next[k]);
        return next;
      });
    } else if (splitMethod === 'shares') {
      setShareMap((prev) => {
        const next = { ...prev };
        participants.forEach((p) => {
          if (next[p] == null) next[p] = '1';
        });
        Object.keys(next).forEach((k) => !participants.includes(k) && delete next[k]);
        return next;
      });
    }
  }, [participants, amount, splitMethod]);

  const exactSum = useMemo(
    () => participants.reduce((s, p) => s + toNum(exactMap[p] || '0'), 0),
    [participants, exactMap]
  );
  const percentSum = useMemo(
    () => participants.reduce((s, p) => s + toNum(percentMap[p] || '0'), 0),
    [participants, percentMap]
  );
  const totalShares = useMemo(
    () => participants.reduce((s, p) => s + toNum(shareMap[p] || '0'), 0),
    [participants, shareMap]
  );

  const warnings: string[] = useMemo(() => {
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

  const onChangeExact = useCallback((id: string, v: string) => {
    setExactMap((m) => ({ ...m, [id]: v }));
  }, []);
  const onChangePercent = useCallback((id: string, v: string) => {
    setPercentMap((m) => ({ ...m, [id]: v }));
  }, []);
  const onChangeShare = useCallback((id: string, v: string) => {
    setShareMap((m) => ({ ...m, [id]: v }));
  }, []);

  // map paidBy id -> friendly label
  const paidByLabel = useMemo(() => {
    if (!paidBy) return 'Select person';
    return getDisplayName(paidBy) || paidBy;
  }, [paidBy, getDisplayName]);

  // participants label (optional: show comma-list if small, otherwise count)
  const participantsLabel = useMemo(() => {
    if (!participants.length) return 'Select members';
    // show names if <= 3, otherwise show count
    const names = participants.map((id) => getDisplayName(id) || id).filter(Boolean);
    return names.length <= 3 ? names.join(', ') : `${participants.length} selected`;
  }, [participants, getDisplayName]);

  const handlePaidByPress = useCallback(async () => {
    if (!onSelectPaidBy) return console.log('Open your "Paid by" picker');
    const res = await onSelectPaidBy();
    if (typeof res === 'string') setPaidBy(res);
  }, [onSelectPaidBy]);

  const handleParticipantsPress = useCallback(async () => {
    if (!onSelectParticipants) return console.log('Open your multi-select');
    const res = await onSelectParticipants();
    if (Array.isArray(res)) setParticipants(res);
  }, [onSelectParticipants]);

  const perPersonFinal = useMemo(() => {
    const out: Record<string, number> = {};
    if (splitMethod === 'equal') {
      participants.forEach((p) => (out[p] = equalPerPerson || 0));
    } else if (splitMethod === 'exact') {
      participants.forEach((p) => (out[p] = toNum(exactMap[p] || '0')));
    } else if (splitMethod === 'percent') {
      participants.forEach((p) => (out[p] = amount * (toNum(percentMap[p] || '0') / 100)));
    } else {
      participants.forEach((p) => {
        const sh = toNum(shareMap[p] || '0');
        out[p] = totalShares > 0 ? (amount * sh) / totalShares : 0;
      });
    }
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

  const handleSave = useCallback(() => {
    if (!title.trim() || !amount || !paidBy || participants.length === 0) {
      console.warn('Please fill Title, Amount, Paid by and Participants.');
      return;
    }
    const hardError =
      (splitMethod === 'percent' && percentSum > 100 + 1e-6) ||
      (splitMethod === 'exact' && exactSum > amount + 1e-6);
    if (hardError) return;
    onSave?.({
      title: title.trim(),
      amount,
      date,
      paidBy,
      participants,
      splitMethod,
      perPerson: perPersonFinal,
    });
    onClose();
  }, [
    title,
    amount,
    date,
    paidBy,
    participants,
    splitMethod,
    onSave,
    onClose,
    percentSum,
    exactSum,
    perPersonFinal,
  ]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Text
        style={{ color: theme.colors.textPrimary }}
        className="mb-2 text-center text-lg font-semibold">
        Add Bills
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
              placeholder="Dinner at BBQ Nation"
              placeholderTextColor={theme.colors.placeholder}
              style={{ color: theme.colors.textPrimary }}
              className="h-11 text-base text-gray-900"
              returnKeyType="next"
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
            onChange={(e, selected) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
          />
        </View>
      )}

      {/* Paid by (shows friendly name now) */}
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
            className={'text-base'}>
            {paidByLabel}
          </Text>
          <MaterialIcons
            name="expand-more"
            size={24}
            style={{ color: theme.colors.textSecondary }}
          />
        </Pressable>
      </View>

      {/* People (shows either names or count) */}
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
            className={'text-base'}>
            {participantsLabel}
          </Text>
          <MaterialIcons name="group-add" size={22} style={{ color: theme.colors.textSecondary }} />
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
            <Pill
              key={opt.key}
              active={splitMethod === opt.key}
              onPress={() => setSplitMethod(opt.key)}>
              {opt.label}
            </Pill>
          ))}
        </View>
      </View>

      {/* Participant list */}
      {participants.length > 0 && (
        <View style={{ backgroundColor: theme.colors.gray50 }} className="mt-2 rounded-2xl p-3">
          {participants.map((id) => (
            <ParticipantRow
              key={id}
              id={id}
              // pass displayName so ParticipantRow can render friendly label (You / name)
              displayName={getDisplayName(id)}
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
            Save Bill
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}
