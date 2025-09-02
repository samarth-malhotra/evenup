import AppHeader from '@/lib/shared/components/AppHeader';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Text } from 'react-native-paper';

function SettleUp() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Settle Up" showBackButton />,
    });
  }, [navigation]);
  return <Text className="text-lg font-semibold">Settle Up</Text>;
}

export default SettleUp;
