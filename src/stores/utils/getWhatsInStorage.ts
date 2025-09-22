import AsyncStorage from '@react-native-async-storage/async-storage';

// Call this in dev mode to check what’s stored.
export async function dumpStorage() {
  const keys = await AsyncStorage.getAllKeys();
  const items = await AsyncStorage.multiGet(keys);
  console.log('AsyncStorage dump:', items);
}
