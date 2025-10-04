// lib/supabaseError.ts
import type { PostgrestError } from '@supabase/supabase-js';

export type NormalizedSupabaseError =
  | { type: 'not_found'; message: string }
  | { type: 'multiple_rows'; message: string }
  | { type: 'auth_error'; message: string }
  | { type: 'permission_denied'; message: string }
  | { type: 'other'; message: string; original: PostgrestError };

export function normalizeSupabaseError(error: PostgrestError): NormalizedSupabaseError {
  switch (error.code) {
    case 'PGRST116':
      return { type: 'not_found', message: 'No row found for this query.' };

    case 'PGRST117':
      return { type: 'multiple_rows', message: 'Multiple rows returned when one expected.' };

    case 'PGRST301':
    case 'PGRST302':
    case 'PGRST401':
      return { type: 'auth_error', message: 'Authentication error. Please log in again.' };

    case 'PGRST303':
      return { type: 'permission_denied', message: 'Permission denied. Check RLS policies.' };

    default:
      return { type: 'other', message: error.message, original: error };
  }
}
