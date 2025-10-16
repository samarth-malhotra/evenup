// src/features/bills/components/common/ParticipantRow.tsx
import { useAtomValue } from 'jotai';
import { memo } from 'react';
import { Image, Text, TextInput, View } from 'react-native';

import { toNum } from '@/features/bills/utils';
import type { GroupMember } from '@/features/groups/types';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';
import type { SplitMethod } from '@/types';

function initialsFor(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? '')).slice(0, 2).toUpperCase();
}

function ParticipantRow({
  member,
  mode,
  amount,
  equalPerPerson,
  percentStr,
  exactStr,
  shareStr,
  totalShares,
  onChangeExact,
  onChangePercent,
  onChangeShare,
}: {
  member: GroupMember | undefined;
  mode: SplitMethod;
  amount: number;
  equalPerPerson: number;
  percentStr: string;
  exactStr: string;
  shareStr: string;
  totalShares: number;
  onChangeExact: (id: string, v: string) => void;
  onChangePercent: (id: string, v: string) => void;
  onChangeShare: (id: string, v: string) => void;
}) {
  const { theme } = useTheme();
  const currentUser = useAtomValue(userAtom);

  const id = member?.id ?? '';
  const name = member?.name ?? 'Unknown';
  const phone = member?.phone ?? '';

  const pct = toNum(percentStr);
  const shares = toNum(shareStr);
  const amountFromPct = amount * (pct / 100);
  const amountFromShare = totalShares > 0 ? (amount * shares) / totalShares : 0;

  const inputCls = 'h-11 px-3 rounded-xl border text-base';
  const inputStyles = {
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
  };

  return (
    <View
      style={{ borderColor: theme.colors.border }}
      className="flex-row items-center border-b py-3"
      accessible
      accessibilityLabel={`participant-${id}`}>
      {/* Avatar */}
      <View className="mr-3">
        {member?.avatar_url ? (
          <Image
            source={{ uri: member.avatar_url }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: theme.colors.gray50,
            }}
            accessibilityLabel={`${name}-avatar`}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: theme.colors.gray50,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
              {initialsFor(name)}
            </Text>
          </View>
        )}
      </View>

      {/* Name + phone */}
      <View className="flex-1 pr-3">
        <Text style={{ color: theme.colors.textPrimary }} className="text-base font-medium">
          {id === currentUser?.id ? 'You' : name}
        </Text>
        {phone ? (
          <Text style={{ color: theme.colors.textSecondary }} className="mt-0.5 text-sm">
            {phone}
          </Text>
        ) : null}
      </View>

      {/* Amount / Inputs */}
      {mode === 'equal' && (
        <Text style={{ color: theme.colors.textPrimary }} className="text-right font-semibold">
          ₹{(equalPerPerson || 0).toFixed(2)}
        </Text>
      )}

      {mode === 'exact' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls} style={inputStyles}>
              <View className="absolute left-3 top-2.5">
                <Text style={{ color: theme.colors.textSecondary }}>₹</Text>
              </View>
              <TextInput
                value={exactStr}
                onChangeText={(t) => onChangeExact(id, t)}
                keyboardType="numeric"
                placeholder={equalPerPerson ? equalPerPerson.toFixed(2) : '0.00'}
                className="h-11 pl-6 pr-2 text-right"
                style={{ color: theme.colors.textPrimary }}
              />
            </View>
          </View>
          <Text style={{ color: theme.colors.textPrimary }} className="w-24 text-right">
            ₹{toNum(exactStr).toFixed(2)}
          </Text>
        </>
      )}

      {mode === 'percent' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls} style={inputStyles}>
              <TextInput
                value={percentStr}
                onChangeText={(t) => onChangePercent(id, t)}
                keyboardType="numeric"
                placeholder={(100).toFixed(0)}
                className="h-11 px-2 pr-4 text-right"
                style={{ color: theme.colors.textPrimary }}
              />
              <View className="absolute right-3 top-2.5">
                <Text style={{ color: theme.colors.textSecondary }}>%</Text>
              </View>
            </View>
          </View>
          <Text style={{ color: theme.colors.textPrimary }} className="w-24 text-right">
            ₹{amountFromPct.toFixed(2)}
          </Text>
        </>
      )}

      {mode === 'shares' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls} style={inputStyles}>
              <TextInput
                value={shareStr}
                onChangeText={(t) => onChangeShare(id, t)}
                keyboardType="numeric"
                placeholder="1"
                className="h-11 px-2 pr-5 text-right"
                style={{ color: theme.colors.textPrimary }}
              />
              <View className="absolute right-3 top-2.5">
                <Text style={{ color: theme.colors.textSecondary }}>sh</Text>
              </View>
            </View>
          </View>
          <Text style={{ color: theme.colors.textPrimary }} className="w-24 text-right">
            ₹{amountFromShare.toFixed(2)}
          </Text>
        </>
      )}
    </View>
  );
}

export default memo(ParticipantRow);
