// components/BalanceBadge.tsx
import React from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';

type Status = 'friends_owe' | 'you_owe' | 'settled' | undefined | null;

export default function BalanceBadge({
  status,
  amountText,
  style,
  small = false,
}: {
  status?: Status;
  amountText?: string;
  style?: ViewStyle;
  small?: boolean;
}) {
  // Figma-like palette (tweak hexes to match your exact Figma tokens)
  const PALETTE = {
    friends: {
      bg: '#ECFDF5', // very light green
      text: '#047857', // green 700
      border: '#D1FAE5',
    },
    you: {
      bg: '#FFFBEB', // very light yellow
      text: '#92400E', // amber-800-ish
      border: '#FEF3C7',
    },
    settled: {
      bg: '#F3F4F6', // light gray
      text: '#374151', // gray-700
      border: '#E5E7EB',
    },
  };

  const variant =
    status === 'friends_owe'
      ? PALETTE.friends
      : status === 'you_owe'
        ? PALETTE.you
        : PALETTE.settled;
  const label =
    status === 'friends_owe'
      ? `Friends owe you ${amountText ?? ''}`
      : status === 'you_owe'
        ? `You owe ${amountText ?? ''}`
        : 'Settled';

  const containerStyles = [
    styles.container,
    small ? styles.containerSmall : null,
    { backgroundColor: variant.bg, borderColor: variant.border },
    style,
  ] as ViewStyle[];

  const textStyles = [
    styles.text,
    small ? styles.textSmall : null,
    { color: variant.text },
  ] as TextStyle[];

  return (
    <View style={containerStyles} accessibilityRole="text" accessibilityLabel={label}>
      <Text numberOfLines={1} ellipsizeMode="tail" style={textStyles}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    // subtle shadow (iOS) + elevation (Android)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  containerSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  textSmall: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
});
