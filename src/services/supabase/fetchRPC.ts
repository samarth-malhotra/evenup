// src/lib/fetchRPC.ts

import { supabase } from '@/services/supabase/supabase';
import { SupaError } from '@/services/supabase/supaError';

export type RPCResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export async function fetchRPC<T>(functionName: string, params: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.rpc(functionName, params);

  // 1️⃣ Supabase / network error
  if (error) {
    throw new SupaError(error.message || 'Supabase RPC error', 'supabase_error');
  }

  // 2️⃣ Unexpected null data
  if (!data) {
    throw new SupaError('No data returned from RPC', 'no_data');
  }

  const response = data as RPCResponse<T>;

  // 3️⃣ App-level error (from SQL)
  if (!response.ok) {
    throw new SupaError(response.message ?? 'RPC returned an error', response.error);
  }

  // 4️⃣ Missing data
  if (!response.data) {
    throw new SupaError(`Missing data in RPC response of function ${functionName}`, 'missing_data');
  }

  return response.data;
}
