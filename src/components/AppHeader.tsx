import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

import WaveHeader from '@/components/WaveHeader';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightActions?: React.ReactNode;
}

export default function AppHeader({ title, showBackButton = true, rightActions }: AppHeaderProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const getColor = useColor();

  return (
    <WaveHeader>
      <View
        // ✅ apply a small upward shift only on iOS
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginTop: Platform.OS === 'ios' ? -40 : 0, // tweak this value (-8 to -16) based on your look
        }}>
        {/* Left */}
        {showBackButton ? (
          <TouchableOpacity onPress={() => navigation.goBack()} className="pr-4">
            <MaterialIcons name="arrow-back" size={24} color={getColor('textWhite')} />
          </TouchableOpacity>
        ) : (
          <View className="w-11" />
        )}

        {/* Title */}
        <Text
          style={{ color: theme.colors.textWhite }}
          className="text-2xl font-semibold tracking-wider">
          {title}
        </Text>

        {/* Right Actions */}
        <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{rightActions}</View>
      </View>
    </WaveHeader>
  );
}
