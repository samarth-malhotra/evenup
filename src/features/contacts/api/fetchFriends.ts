import { supabase } from '@/services/supabase/supabase';

type FriendRPC = {
  friendship_id: string;
  friend_id: string;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
};

export async function fetchFriends(userId: string | undefined) {
  if (!userId) return [];
  const { data, error } = await supabase.rpc('get_friends', { user_id: userId });
  if (error) {
    throw new Error(error.message ?? 'Failed to fetch friends');
  }
  return (data as FriendRPC[]) || [];
}
