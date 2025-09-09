import clsx from 'clsx';
import { Text, View } from 'react-native';

type AvatarProps = {
  name: string;
  size?: number;
  className?: string;
};

export function Avatar({ name, size = 48, className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      className={clsx('items-center justify-center rounded-full bg-indigo-500', className)}
      style={{ width: size, height: size }}>
      <Text className="text-lg font-semibold text-gray-800">{initials}</Text>
    </View>
  );
}
