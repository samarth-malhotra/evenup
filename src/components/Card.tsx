// lib/components/ui/Card.tsx
import { getBoxShadow } from '@/hooks/getBoxShadow';
import React from 'react';
import { View } from 'react-native';

import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

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
