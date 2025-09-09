// lib/components/ui/Card.tsx
import React from 'react';
import { Text, View } from 'react-native';

import { useElevation } from '@/hooks/useElevation';

import { getColor } from '../utils/color';

import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

type CardType = 'total' | 'you' | 'friend';

type CardProps = ViewProps & {
  title?: string;
  value?: string | number | React.ReactNode;
  /**
   * Choose automatic value color by semantic type.
   * If omitted, uses default text color (`evenup-on-surface` via Tailwind).
   */
  type?: CardType;
  children?: React.ReactNode;
  elevation?: number; // Android elevation (fallback)
  className?: string; // extra tailwind classes
  style?: StyleProp<ViewStyle>;
};

const typeToColor: Record<CardType, string> = {
  total: getColor('evenup-primary'),
  you: getColor('warning'),
  friend: getColor('success'),
};

export default function SummaryCard({
  title,
  value,
  type = 'total',
  children,
  elevation = 4,
  className = '',
  style,
  ...rest
}: CardProps) {
  const elev = useElevation(elevation);

  // If `type` present, pick mapped color; otherwise no inline color (use tailwind text color)
  const valueColor = type ? typeToColor[type] : undefined;

  return (
    <View
      className={`bg-surface shadow-card flex-1 items-center rounded-2xl p-4 ${className}`}
      style={[elev as StyleProp<ViewStyle>, style]}
      {...rest}>
      {title ? <Text className="text-muted text-md mb-1">{title}</Text> : null}

      {value !== undefined ? (
        // If the value is a node (component), render it directly (but still wrap to apply color if needed)
        typeof value === 'string' || typeof value === 'number' ? (
          <Text
            className="text-2xl font-extrabold"
            // apply inline color only if type was provided; otherwise falls back to Tailwind text color
            style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </Text>
        ) : (
          // If value is a React node, wrap it with a container so children can still use color if needed.
          <View>
            {/*
              If consumer passed a React node and also wants color applied,
              they can read the color from the mapping (or we could expose a helper,
              but keeping simple here).
            */}
            {value}
          </View>
        )
      ) : null}

      {children}
    </View>
  );
}
