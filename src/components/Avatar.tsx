// components/Avatar.tsx
import clsx from 'clsx';
import React, { memo } from 'react';
import { Image, Text, View } from 'react-native';

import type { NestedTheme } from '@/components/ThemeProvider';
import { useTheme } from '@/theme/hooks/useTheme';

export type AvatarProps = {
  name: string;
  imageUri?: string | null;
  icon?: React.ReactNode | null;
  size?: number; // diameter
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
  /** Scale factor for text size (default: 0.45 → ~45% of diameter) */
  textScale?: number;
  theme?: NestedTheme;
};

const DEFAULT_SIZE = 48;

/** helper: get initials from a name, ignoring non-letters */
function getInitials(name: string) {
  if (!name?.trim()) return '?';

  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, '').toUpperCase())
    .filter(Boolean);

  if (words.length === 0) return '?';

  if (words.length === 1) {
    // Single word → take first two letters
    const initials = words[0].slice(0, 2);
    return initials || '?';
  }

  // Multiple words → first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = memo(
  ({
    name,
    imageUri,
    icon,
    size = DEFAULT_SIZE,
    className,
    testID,
    accessibilityLabel,
    textScale = 0.3, // default font scale relative to avatar
    // theme,
  }) => {
    const { theme } = useTheme();
    const initials = getInitials(name);
    const diameter = Math.max(24, size);
    const borderRadius = diameter / 2;

    // dynamic font size → ensures initials always scale nicely
    const fontSize = diameter * textScale;
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={accessibilityLabel ?? name}
        className={clsx('mr-3 items-center justify-center overflow-hidden rounded-full', className)}
        style={{
          backgroundColor: theme?.colors.gray200,
          width: diameter,
          height: diameter,
          borderRadius,
        }}>
        {icon ? (
          icon
        ) : imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="h-full w-full"
            style={{ borderRadius }}
            resizeMode="cover"
          />
        ) : (
          <Text className="font-bold" style={{ color: theme?.colors.textPrimary, fontSize }}>
            {initials}
          </Text>
        )}
      </View>
    );
  }
);
