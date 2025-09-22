// components/Avatar.tsx
import { NestedTheme } from '@/components/ThemeProvider';
import { useTheme } from '@/hooks/useTheme';
import clsx from 'clsx';
import React, { memo } from 'react';
import { Image, Text, View } from 'react-native';

export type AvatarProps = {
  name: string;
  imageUri?: string;
  icon?: React.ReactNode;
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
  return name
    .split(/\s+/) // split on spaces
    .map((word) => word.replace(/[^a-zA-Z]/g, '')) // remove non-letters
    .filter(Boolean) // drop empty
    .map((word) => word[0]?.toUpperCase())
    .join('')
    .slice(0, 2); // max 2 chars
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
