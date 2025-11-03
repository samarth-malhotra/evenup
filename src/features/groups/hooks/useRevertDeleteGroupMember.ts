import { rpc } from '@/services/supabase/constant';
import { fetchRPC } from '@/services/supabase/fetchRPC';

type RevokeDeleteMemberPayload = {
  groupId: string;
  userId: string;
  removedUserId: string;
};

type RevokedMemberResponse = {
  id: string;
  role: string;
  status: string;
  left_at: string;
  user_id: string;
  group_id: string;
  joined_at: string;
  invited_by: string;
  removed_by: string;
};

export async function revertDeletedGroupMember({
  groupId,
  userId,
  removedUserId,
}: RevokeDeleteMemberPayload): Promise<RevokedMemberResponse> {
  return await fetchRPC<RevokedMemberResponse>(rpc.revertDeletedGroupMember, {
    p_group_id: groupId,
    p_user_id: userId,
    p_deleted_user_id: removedUserId,
  });
}
