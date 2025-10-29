import { Text, View } from 'react-native';

export function BalanceBadge({
  status,
  amountText,
}: {
  status: 'friends_owe' | 'you_owe' | 'settled' | undefined | null;
  amountText: string;
}) {
  const bg =
    status === 'friends_owe'
      ? 'bg-emerald-100' // green-ish
      : status === 'you_owe'
        ? 'bg-yellow-100' // yellow-ish
        : 'bg-gray-100'; // settled
  const textColor =
    status === 'friends_owe'
      ? 'text-emerald-800'
      : status === 'you_owe'
        ? 'text-yellow-800'
        : 'text-gray-700';

  const label =
    status === 'friends_owe'
      ? `Friends owe you ${amountText}`
      : status === 'you_owe'
        ? `You owe ${amountText}`
        : 'Settled';

  return (
    <View
      style={{
        backgroundColor: undefined,
      }}
      className={`rounded-full px-3 py-1 ${bg} shadow-sm`}>
      <Text className={`text-[13px] font-medium ${textColor}`}>{label}</Text>
    </View>
  );
}
