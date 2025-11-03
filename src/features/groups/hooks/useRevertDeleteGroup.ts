import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

/**
 * Calls Supabase RPC to Revert soft deleted group
 */
export async function revertGroupDelete(groupId: string, userId: string) {
  return await fetchRPC<{ group_id: string }>(rpc.revertGroupDelete, {
    p_group_id: groupId,
    p_user_id: userId,
  });
}
