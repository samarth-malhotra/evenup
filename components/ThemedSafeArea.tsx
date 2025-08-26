// components/ThemedSafeArea.tsx
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../theme/color";

import type { ColorKey } from "../theme/color";
import type { StyleProp, ViewStyle } from "react-native";
import type { Edge } from "react-native-safe-area-context";
// import { COLORS, ColorKey } from "@/theme/colors";

type Props = {
  children: React.ReactNode;
  /** Use a key from COLORS or pass any valid color string */
  bg?: ColorKey | string;
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
  /** Status bar style for this screen */
  statusBarStyle?: "light" | "dark" | "auto" | "inverted";
  /** When true, sets StatusBar background to match bg on Android */
  statusBarBackgroundMatch?: boolean;
  /** (Optional) className for NativeWind; ignored if not installed */
  className?: string;
};

export default function ThemedSafeArea({
  children,
  bg = "white",
  padding = 0,
  scroll = false,
  style,
  contentContainerStyle,
  edges = ["top", "bottom"],
  statusBarStyle = "auto",
  statusBarBackgroundMatch = true,
  className,
}: Props) {
  // const insets = useSafeAreaInsets();
  const backgroundColor = (COLORS as any)[bg] ?? bg;

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { backgroundColor, paddingHorizontal: padding },
    style,
  ];

  // const contentPadTop = edges.includes("top") ? insets.top : 0;
  // const contentPadBottom = edges.includes("bottom") ? insets.bottom : 0;

  return (
    <SafeAreaView
      style={[{ backgroundColor }, styles.flex]}
      edges={edges}
      // @ts-expect-error allow className if nativewind is present
      className={className}
    >
      <StatusBar
        style={statusBarStyle}
        backgroundColor={
          statusBarBackgroundMatch ? (backgroundColor as string) : undefined
        }
      />

      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            // { paddingTop: contentPadTop, paddingBottom: contentPadBottom },
            // { paddingVertical: 12 }, // small default vertical gap
            contentContainerStyle,
          ]}
          style={containerStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            containerStyle,
            // { paddingTop: contentPadTop, paddingBottom: contentPadBottom },
          ]}
          // @ts-expect-error allow className if nativewind is present
          className={className}
        >
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
