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
// Newly Created will remove above one as we progress
export enum USER_STATUS {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum APP_MODE {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum COLOR_SHADE {
  LIGHT = 'light',
  DARK = 'dark',
  DEFAULT = 'DEFAULT',
}

export enum TOAST_TYPE {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}
