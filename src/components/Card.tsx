// lib/components/ui/Card.tsx
import React from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { getBoxShadow } from '@/theme/hooks/getBoxShadow';

type CardProps = ViewProps & {
  children: React.ReactNode;
  className?: string; // Tailwind classes
  style?: StyleProp<ViewStyle>; // inline overrides
};

export default function Card({ children, className = '', style, ...rest }: CardProps) {
  return (
    <View className={`bg-surface ${className}`} style={[style, getBoxShadow('md')]} {...rest}>
      {children}
    </View>
  );
}
