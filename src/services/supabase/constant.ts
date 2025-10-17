const baseUrl = 'https://wrnepxzmmuzcsmjmadli.supabase.co'; // move this to ENV
const anonkey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybmVweHptbXV6Y3Ntam1hZGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjE0NTYsImV4cCI6MjA3NDAzNzQ1Nn0.NcrD3dr1bxmHzH81ThzGbXxlAnS5qBIAod618CvSSvs'; // move this to ENV

const functionVersion = `${baseUrl}/functions/v1`;

export const sb = {
  baseUrl,
  anonkey,
} as const;

export const edge = {
  signup: `${functionVersion}/signup`,
  addMember: `${functionVersion}/add-member`,
} as const;

export const rpc = {
  getGroupDetails: 'get_group_details',
  deleteGroup: 'delete_group',
  deleteGroupMember: 'delete_group_member',
  getGroupList: 'get_user_groups',
  getUserProfileById: 'get_user_profile_by_id',
  updateUserProfile: 'update_user_profile',
  getFriendList: 'get_friends',
  createGroup: 'create_group',
} as const;
