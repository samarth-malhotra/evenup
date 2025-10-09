import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Text, View } from 'react-native';

import AppHeader from '@/components/AppHeader';

function ContactList() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title={'Add Members'} showBackButton />,
    });
  }, [navigation]);
  return (
    <View>
      <Text>ContactList</Text>
    </View>
  );
}

export default ContactList;
