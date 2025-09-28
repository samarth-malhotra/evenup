import React from 'react';
import { Dimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  G,
  Mask,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';

import { useColor } from '@/hooks/useColor';

const { width } = Dimensions.get('window');

export default function WaveHeader({ children }: { children?: React.ReactNode }) {
  const getColor = useColor();

  const insets = useSafeAreaInsets();
  const H = children ? 160 : 90;
  const backgroundColor = getColor('surface');
  const top = getColor('primary');
  const bottom = getColor('primary', 'dark');

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
    <View className="relative" style={{ height: H - (children ? 60 : 30) }}>
      <Svg width={width} height={'100%'}>
        <Defs>
          {/* background gradient */}
          <SvgGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={top} />
            <Stop offset="100%" stopColor={bottom} />
          </SvgGradient>

          {/* fade mask */}
          <SvgGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={backgroundColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={backgroundColor} stopOpacity="0" />
          </SvgGradient>

          <Mask id="fadeMask">
            <Rect x="0" y="0" width={width} height={H} fill={'#fff'} />
          </Mask>
        </Defs>

        {/* full background */}
        <Rect x="0" y="0" width={width} height={H} fill="url(#bg)" />

        {/* Waves */}
        <G mask="url(#fadeMask)">
          {/* Main decorative wave */}
          <Path d={wave(0.0)} fill={backgroundColor} fillOpacity={0.22} />
          <Path d={wave(0.05)} fill={backgroundColor} />
        </G>
      </Svg>

      <View
        className="absolute inset-0 px-4"
        style={{
          paddingTop: insets.top,
          minHeight: H * 0.65,
        }}>
        {children}
      </View>
    </View>
  );
}
