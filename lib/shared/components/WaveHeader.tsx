import React from 'react';
import { Dimensions, View } from 'react-native';
import Svg, {
  Defs,
  G,
  Mask,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';

import { COLORS } from '../../../theme/color';

const { width } = Dimensions.get('window');

export default function WaveHeader({ children }: { children?: React.ReactNode }) {
  const H = children ? 180 : 90;
  const backgroundColor = (COLORS as any)['white'];
  const top = '#6C4CE6';
  const bottom = '#5336D3';

  // One curvy wave (closes to bottom so area below becomes white)
  const wave = (offset = 0) => `
    M 0 ${H * (0.48 + offset)}
    C ${width * 0.2} ${H * (0.35 + offset)},
      ${width * 0.6} ${H * (0.7 + offset)},
      ${width} ${H * (0.45 + offset)}
    L ${width} ${H}
    L 0 ${H}
    Z
  `;

  return (
    <View className="mb-4" style={{ height: H - (children ? 70 : 30) }}>
      <Svg width={width} height={'100%'}>
        <Defs>
          {/* background gradient */}
          <SvgGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={top} />
            <Stop offset="100%" stopColor={bottom} />
          </SvgGradient>

          {/* fade mask */}
          <SvgGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </SvgGradient>

          <Mask id="fadeMask">
            <Rect x="0" y="0" width={width} height={H} fill={backgroundColor} />
          </Mask>
        </Defs>

        {/* full background */}
        <Rect x="0" y="0" width={width} height={H} fill="url(#bg)" />

        {/* Waves */}
        <G mask="url(#fadeMask)">
          {/* Main decorative wave */}
          <Path d={wave(0.0)} fill="#FFFFFF" fillOpacity={0.22} />
          <Path d={wave(0.05)} fill={backgroundColor} />
        </G>
      </Svg>

      <View className="absolute inset-0 top-9 px-4">{children}</View>
    </View>
  );
}
