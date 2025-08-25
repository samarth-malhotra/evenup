import React from "react";
import { View, Dimensions } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Mask,
  Rect,
  G,
  Path,
} from "react-native-svg";

const { width } = Dimensions.get("window");

export default function MiniHeaderWaves({
  height = 120,          // keep it < 100
  top = "#6C4CE6",
  bottom = "#5336D3",
}: {
  height?: number;
  top?: string;
  bottom?: string;
}) {
  const H = Math.min(150, Math.max(100, height)); // safety: never >= 100

  // One curvy wave (closes to bottom so area below becomes white)
  const wave = (offset = 0) => `
    M 0 ${H * (0.48 + offset)}
    C ${width * 0.20} ${H * (0.25 + offset)},
      ${width * 0.60} ${H * (0.80 + offset)},
      ${width} ${H * (0.52 + offset)}
    L ${width} ${H}
    L 0 ${H}
    Z
  `;

  return (
    <View style={{ height: 105 }}>
      <Svg width={width} height={105}>
        <Defs>
          {/* purple backdrop for the top area */}
          <SvgGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={top} />
            <Stop offset="100%" stopColor={bottom} />
          </SvgGradient>

          {/* fade the waves on the right edge */}
          <SvgGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </SvgGradient>

          <Mask id="fadeMask">
            <Rect x="0" y="0" width={width} height={105} fill="#fff" />
          </Mask>
        </Defs>

        {/* full background gradient */}
        <Rect x="0" y="0" width={width} height={H} fill="url(#bg)" />

        {/* Waves: identical shapes; second is solid white so the bottom is 100% white */}
        <G mask="url(#fadeMask)">
          <Path d={wave(0.00)} fill="#FFFFFF" fillOpacity={0.22} />
          <Path d={wave(0.07)} fill="#FFFFFF" />{/* solid white -> merges with page */}
        </G>
      </Svg>
    </View>
  );
}
