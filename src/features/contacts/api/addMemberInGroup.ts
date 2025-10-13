import axios from 'axios';

const FUNCTION_ROOT = 'https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/groups-invite';

export async function addMemberInGroup(groupId: string, payload: any, token?: string) {
  const url = `${FUNCTION_ROOT.replace(/\/$/, '')}/groups/${groupId}/invite`;
  const res = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    timeout: 15_000,
  });
  return res.data;
}
