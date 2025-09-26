import { queryClient } from '@/api/helper/queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

// create persister backed by AsyncStorage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'evenup:react-query-cache',
});

// small wrapper component to use at app root
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        // throttle to avoid saving too often (ms)
        // optional: dehydrate options, max age etc.
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
