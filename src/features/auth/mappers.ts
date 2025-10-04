// src/lib/auth/mappers.ts
import type { User as SupabaseUser } from '@supabase/supabase-js';

import type { User as EvenUpUser } from '@/types';

/**
 * Map Supabase user -> minimal EvenUp User
 * Keeps only the flat fields your app relies on.
 */
export function mapSupabaseUserToUser(
  su: SupabaseUser | null | undefined,
  prev?: EvenUpUser | null
): EvenUpUser | null {
  if (!su) return null;

  const metadata = (su as any).user_metadata ?? {};

  return {
    id: su.id,
    email: su.email ?? '',
    phone: su.phone,
    name: (metadata.full_name ?? metadata.name ?? metadata.displayName ?? '') as string,
    created_at: su.created_at ?? null,
    updated_at: (su as any).updated_at ?? null,
    avatar_url: metadata.avatar_url ?? metadata.avatar ?? null,
    // role: ((su as any).role ?? metadata.role ?? null) as string | null,

    // ✅ retain existing nickname if present
    nickname: prev?.nickname ?? '',
  };
}
