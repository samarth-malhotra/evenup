import type { RPCResponse } from '@/services/supabase/fetchRPC';
import { SupaError } from '@/services/supabase/supaError';

export type CallEdgeOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any; // object will be JSON.stringified
  accessToken?: string | null;
  headers?: Record<string, string>;
  allowNoData?: boolean; // if true, allow ok:true with no data and return undefined
  timeoutMs?: number; // optional, not implemented here but placeholder
};

/**
 * Generic caller for Supabase Edge Functions (or any RPC-style HTTP function)
 * - Expects the HTTP response to follow RPCResponse<T>.
 * - Throws supaError on network/http/app errors.
 */
export async function edgeFunction<T>(
  baseUrl: string,
  //   path = '',
  opts: CallEdgeOptions = {}
): Promise<T | undefined> {
  const {
    method = 'POST',
    body = undefined,
    accessToken = null,
    headers = {},
    allowNoData = false,
  } = opts;

  // build URL safely
  const cleanBase = baseUrl.replace(/\/+$/, '');
  //   const cleanPath = String(path).replace(/^\/+|\/+$/g, '');
  const url = cleanBase;

  const fetchHeaders: Record<string, string> = {
    ...headers,
  };
  if (body !== undefined && !('Content-Type' in fetchHeaders)) {
    fetchHeaders['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    fetchHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON, but tolerate non-JSON (null)
  const json = await res.json().catch(() => null);

  // HTTP-level error: try to surface structured message from json if present
  if (!res.ok) {
    const errMsg = (json && (json.error || json.message)) ?? `HTTP ${res.status} ${res.statusText}`;
    throw new SupaError(errMsg, 'http_error');
  }

  if (json == null) {
    // Some functions might legitimately return 204 No Content. But by default we treat absent JSON as error.
    if (allowNoData) return undefined;
    throw new SupaError('Empty or invalid JSON response from function', 'invalid_json');
  }

  // Ensure shape is RPCResponse<T> (best-effort)
  const response = json as RPCResponse<T>;

  if (typeof response.ok !== 'boolean') {
    // If it's not the RPC wrapper, maybe the function returned raw data directly.
    // In that case assume the raw JSON is the data we want.
    // This keeps compatibility with older functions that don't wrap.
    // If you prefer to enforce wrapper strictly, remove this branch and throw.
    return json as T;
  }

  // Now enforce RPC wrapper semantics
  if (!response.ok) {
    throw new SupaError(response.message ?? 'Function returned ok:false', response.error);
  }

  if (response.data === undefined) {
    if (allowNoData) return undefined;
    throw new SupaError('Missing data in RPC response', 'missing_data');
  }

  return response.data;
}
