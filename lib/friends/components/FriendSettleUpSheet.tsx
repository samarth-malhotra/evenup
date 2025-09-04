// lib/shared/components/SettleSheet.tsx
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import BottomSheet from '@/lib/shared/components/BottomSheet';

import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';

type Relation = 'owe' | 'owed' | string;

type Props = {
  open: boolean;
  onClose: () => void;
  friendName: string;
  relation: Relation; // 'owe' → you pay friend; otherwise friend pays you
  amountStr: string;
  onChangeAmount: (v: string) => void;
  onConfirm: () => void;
};

export default function FriendSettleUpSheet({
  open,
  onClose,
  friendName,
  relation,
  amountStr,
  onChangeAmount,
  onConfirm,
}: Props) {
  const sheetRef = useRef<BottomSheetModalType>(null);

  useEffect(() => {
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  const payer = relation === 'owe' ? 'You' : friendName;
  const payee = relation === 'owe' ? friendName : 'You';

  const numericAmount = (() => {
    const n = parseFloat((amountStr || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  })();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Text className="text-center text-lg font-semibold text-gray-900">Confirm Settlementtt</Text>

      <Text className="mt-2 text-center text-sm text-gray-700">
        {payer} → {payee}
      </Text>

      <View className="mt-4 rounded-2xl bg-gray-50 p-3">
        <Text className="mb-1 text-xs text-gray-500">Amount</Text>
        <BottomSheetTextInput
          value={amountStr}
          onChangeText={onChangeAmount}
          keyboardType="numeric"
          placeholder="₹ 0.00"
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: '#111827',
            paddingVertical: 4,
          }}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <Text className="mt-2 text-center text-xs text-gray-500">
        Preview: {payer} paying {payee} · ₹{numericAmount || 0}
      </Text>

      <Text className="mt-4 text-center text-xs text-gray-500">
        ⚠️ This step does not transfer money. It only records settlement in the app.
      </Text>

      <View className="mt-5 flex-row gap-3">
        <Pressable onPress={onClose} className="flex-1 rounded-full bg-gray-200 py-3">
          <Text className="text-center font-medium text-gray-700">Cancel</Text>
        </Pressable>
        <Pressable onPress={onConfirm} className="flex-1 rounded-full bg-green-600 py-3">
          <Text className="text-center font-medium text-white">Settle</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
