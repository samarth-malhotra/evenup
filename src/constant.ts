export enum MemberRoleEnum {
  Admin = 'admin',
  Member = 'member',
}

export enum SplitMethodEnum {
  Equal = 'equal',
  Exact = 'exact',
  Percent = 'percent',
  Shares = 'shares',
}

export enum ExpenseStatusEnum {
  Active = 'active',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum ActivityTypeEnum {
  ExpenseCreated = 'expense_created',
  PaymentMade = 'payment_made',
  MemberJoined = 'member_joined',
  MemberLeft = 'member_left',
}

export enum FriendStatusEnum {
  Pending = 'pending',
  Accepted = 'accepted',
  Blocked = 'blocked',
  Removed = 'removed',
}
