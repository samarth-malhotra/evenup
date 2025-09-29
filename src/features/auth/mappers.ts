// src/lib/auth/mappers.ts
import type { User as SupabaseUser } from '@supabase/supabase-js';

import type { User as EvenUpUser } from '@/types';

/**
 * Map Supabase user -> minimal EvenUp User
 * Keeps only the flat fields your app relies on.
 */
export function mapSupabaseUserToUser(su: SupabaseUser | null | undefined): EvenUpUser | null {
  if (!su) return null;

  // Typical supabase user fields: id, email, phone, user_metadata, created_at, updated_at
  // user_metadata might contain display_name / full_name depending on your auth pipeline
  const metadata = (su as any).user_metadata ?? {};

  return {
    id: su.id,
    email: su.email ?? null,
    phone: su.phone ?? null,
    name: (metadata.full_name ?? metadata.name ?? metadata.displayName ?? null) as string | null,
    // keep ISO strings for timestamps (or convert to Date if your types require)
    createdAt: su.created_at ?? null,
    updatedAt: (su as any).updated_at ?? null,
    // add any other flat fields you need, e.g. avatarUrl, role etc. pulled from metadata or app claims
    avatarUrl: metadata.avatar_url ?? metadata.avatar ?? null,
    role: ((su as any).role ?? metadata.role ?? null) as string | null,
  } as EvenUpUser;
}
