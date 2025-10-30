import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React from 'react';

import { queryClient } from '@/services/helper/queryClient';

// create persister backed by AsyncStorage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'evenup:react-query-cache',
});

// small wrapper component to use at app root
// QueryProvider.tsx
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        // avoid persisting in-flight / pending queries
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Persist only queries that are not fetching and that have data (status 'success' or 'error' if you want)
            // adjust to your preferences: here we only persist successful queries
            return !query.state.isInvalidated && query.state.status === 'success';
          },
        },
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
