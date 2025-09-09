// lib/components/ui/Card.tsx
import React from 'react';
import { View } from 'react-native';

import { useElevation } from '@/hooks/useElevation';

import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

type CardProps = ViewProps & {
  children: React.ReactNode;
  elevation?: number; // default 4
  className?: string; // Tailwind classes
  style?: StyleProp<ViewStyle>; // inline overrides
};

export default function Card({
  children,
  elevation = 4,
  className = '',
  style,
  ...rest
}: CardProps) {
  const elev = useElevation(elevation);

  return (
    <View className={`bg-surface shadow-card ${className}`} style={[elev, style]} {...rest}>
      {children}
    </View>
  );
}
