// app/profile/edit.tsx
import AppHeader from '@/lib/shared/components/AppHeader';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Text, View } from 'react-native';

export default function EditProfile() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Edit Profile" showBackButton />,
    });
  }, [navigation]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Edit Profile</Text>
    </View>
  );
}
