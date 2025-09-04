import { memo } from 'react';
import { Text, TextInput, View } from 'react-native';

import { labelFor, toNum } from '../../utils';

import type { SplitMethod } from '../../types';

function ParticipantRow({
  id,
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
  id: string;
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
  const pct = toNum(percentStr);
  const shares = toNum(shareStr);
  const amountFromPct = amount * (pct / 100);
  const amountFromShare = totalShares > 0 ? (amount * shares) / totalShares : 0;

  const inputCls = 'h-11 px-3 rounded-xl border border-gray-300 bg-white text-base text-gray-900';

  return (
    <View className="flex-row items-center border-b border-gray-200 py-2">
      <Text className="w-28 pr-2 text-gray-800">{labelFor(id)}</Text>

      {mode === 'equal' && (
        <Text className="flex-1 text-right font-semibold text-gray-900">
          ₹{(equalPerPerson || 0).toFixed(2)}
        </Text>
      )}

      {mode === 'exact' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls}>
              <View className="absolute left-3 top-2.5">
                <Text className="text-gray-500">₹</Text>
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
          <Text className="w-24 text-right text-gray-500">₹{toNum(exactStr).toFixed(2)}</Text>
        </>
      )}

      {mode === 'percent' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls}>
              <TextInput
                value={percentStr}
                onChangeText={(t) => onChangePercent(id, t)}
                keyboardType="numeric"
                placeholder={(100).toFixed(0)}
                className="h-11 px-2 text-right"
              />
              <View className="absolute right-3 top-2.5">
                <Text className="text-gray-500">%</Text>
              </View>
            </View>
          </View>
          <Text className="w-24 text-right text-gray-500">₹{amountFromPct.toFixed(2)}</Text>
        </>
      )}

      {mode === 'shares' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls}>
              <TextInput
                value={shareStr}
                onChangeText={(t) => onChangeShare(id, t)}
                keyboardType="numeric"
                placeholder="1"
                className="h-11 px-2 text-right"
              />
              <View className="absolute right-3 top-2.5">
                <Text className="text-gray-500">sh</Text>
              </View>
            </View>
          </View>
          <Text className="w-24 text-right text-gray-500">₹{amountFromShare.toFixed(2)}</Text>
        </>
      )}
    </View>
  );
}

export default memo(ParticipantRow);
