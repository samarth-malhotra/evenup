// app/settings/index.tsx
import AppHeader from '@/lib/shared/components/AppHeader';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Text, View } from 'react-native';

export default function SettingsScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Friends" showBackButton />,
    });
  }, [navigation]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Friends</Text>
    </View>
  );
}
