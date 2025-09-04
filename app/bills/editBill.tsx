// no required - remove
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';
export default function EditBillScreen() {
  return (
    <ThemedSafeArea bg="white" statusBarStyle="dark" scroll={false} padding={16}>
      <View>
        <Text>Edit Page</Text>
      </View>
    </ThemedSafeArea>
  );
}
