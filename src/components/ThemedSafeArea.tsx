// components/ThemedSafeArea.tsx
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColor } from '@/theme/hooks/useColor';

type Props = {
  children: React.ReactNode;
  /** Use a key from COLORS or pass any valid color string */
  bg?: string;
  /** Add default padding inside */
  padding?: number;
  /** If true, content is placed in a ScrollView */
  scroll?: boolean;
  /** Forward extra style */
  style?: StyleProp<ViewStyle>;
  /** Extra style for ScrollView’s content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Which edges get safe-area padding (default: top+bottom) */
  edges?: Readonly<Edge[]>;
  /** (Optional) className for NativeWind; ignored if not installed */
  className?: string;
};

export default function ThemedSafeArea({
  children,
  bg,
  padding = 0,
  scroll = false,
  style,
  contentContainerStyle,
  edges = ['right', 'left'],
  className,
}: Props) {
  // const insets = useSafeAreaInsets();
  const getColor = useColor();
  const backgroundColor = bg ?? getColor('surface');

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { backgroundColor, paddingHorizontal: padding },
    style,
  ];

  // const contentPadTop = edges.includes("top") ? insets.top : 0;
  // const contentPadBottom = edges.includes("bottom") ? insets.bottom : 0;

  return (
    <SafeAreaView style={[{ backgroundColor }, styles.flex]} edges={edges} className={className}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[contentContainerStyle]}
          style={containerStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[containerStyle]} className={className}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
  },
});
