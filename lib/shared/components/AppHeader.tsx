import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import WaveHeader from '@/lib/shared/components/WaveHeader';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightActions?: React.ReactNode;
}

export default function AppHeader({ title, showBackButton = true, rightActions }: AppHeaderProps) {
  const navigation = useNavigation();

  return (
    <WaveHeader>
      <View className="flex-row items-baseline justify-between">
        {/* Left */}
        {showBackButton ? (
          <TouchableOpacity onPress={() => navigation.goBack()} className="pr-4">
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <View className="w-11"></View>
        )}

        {/* Title */}
        <Text className="text-2xl font-semibold tracking-wider text-white">{title}</Text>

        {/* Right Actions */}
        <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{rightActions}</View>
      </View>
    </WaveHeader>
  );
}
