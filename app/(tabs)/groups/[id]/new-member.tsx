import AppHeader from '@/lib/shared/components/AppHeader';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Text } from 'react-native-paper';

function NewMember() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="New Member" showBackButton />,
    });
  }, [navigation]);
  return <Text className="text-lg font-semibold">New Member</Text>;
}

export default NewMember;
