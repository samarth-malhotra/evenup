import { memo } from 'react';
import { Text, TextInput, View } from 'react-native';

import { labelFor, toNum } from '@/features/bills/utils';
import { useTheme } from '@/theme/hooks/useTheme';
import type { SplitMethod } from '@/types';

function ParticipantRow({
  id,
  displayName,
  mode,
  amount,
  equalPerPerson,
  percentStr = '',
  exactStr = '',
  shareStr = '',
  totalShares = 0,
  onChangeExact,
  onChangePercent,
  onChangeShare,
}: {
  id: string;
  displayName?: string; // prefer this over labelFor(id)
  mode: SplitMethod;
  amount: number;
  equalPerPerson: number;
  percentStr?: string;
  exactStr?: string;
  shareStr?: string;
  totalShares?: number;
  onChangeExact: (id: string, v: string) => void;
  onChangePercent: (id: string, v: string) => void;
  onChangeShare: (id: string, v: string) => void;
}) {
  const { theme } = useTheme();
  const pct = toNum(percentStr || '0');
  const shares = toNum(shareStr || '0');
  const amountFromPct = amount * (pct / 100);
  const amountFromShare = totalShares > 0 ? (amount * shares) / totalShares : 0;

  const inputCls = 'h-11 px-3 rounded-xl border text-base';
  const inputStyles = {
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
  };

  // prefer displayName if provided, otherwise fallback to labelFor(id)
  const label = displayName ?? labelFor(id);

  return (
    <View
      style={{ borderColor: theme.colors.border }}
      className="flex-row items-center border-b py-2">
      <Text style={{ color: theme.colors.textPrimary }} className="w-28 pr-2">
        {label}
      </Text>

      {mode === 'equal' && (
        <Text
          style={{ color: theme.colors.textPrimary }}
          className="flex-1 text-right font-semibold">
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
              />
            </View>
          </View>
          <Text style={{ color: theme.colors.textPrimary }} className="w-24 text-right">
            ₹{toNum(exactStr || '0').toFixed(2)}
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
