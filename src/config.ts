// src/config.ts
import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
  featureNewSummary?: boolean | string;
  sentryDsn?: string;
  env?: string;
  appVersion?: string;
  iosBuildNumber?: string | number;
  androidVersionCode?: string | number;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  inviteExpiryDays?: number;
  inviteLimitPerDay?: number;
  contactsMatchEndpoint?: string;
  groupInvitesEndpoint?: string;
  acceptInviteEndpoint?: string;
  resendInviteEndpoint?: string;
};

const rawExtra = ((Constants.expoConfig && Constants.expoConfig.extra) ||
  (Constants.manifest && (Constants.manifest as any).extra) ||
  {}) as Extra;

/**
 * Helpful helper: coerce boolean-like values
 */
const asBool = (v?: boolean | string) => v === true || v === 'true' || v === '1';

export const CONFIG = {
  API_URL: rawExtra.apiUrl ?? 'https://api.evenup.com',
  FEATURE_NEW_SUMMARY: asBool(rawExtra.featureNewSummary) ?? false,
  SENTRY_DSN: rawExtra.sentryDsn ?? '',
  ENV: rawExtra.env ?? 'development',
  APP_VERSION: rawExtra.appVersion ?? '1.0.0',
  IOS_BUILD_NUMBER: String(rawExtra.iosBuildNumber ?? '1'),
  ANDROID_VERSION_CODE: Number(rawExtra.androidVersionCode ?? 1),
  SUPABASE_URL: rawExtra.supabaseUrl ?? '',
  SUPABASE_ANON_KEY: rawExtra.supabaseAnonKey ?? '',
  CONTACTS_MATCH_ENDPOINT: rawExtra.contactsMatchEndpoint ?? '',
  GROUPS_INVITE_ENDPOINT: rawExtra.groupInvitesEndpoint ?? '',
  ACCEPT_INVITE_ENDPOINT: rawExtra.acceptInviteEndpoint ?? '',
  RESEND_INVITE_ENDPOINT: rawExtra.resendInviteEndpoint ?? '',

  INVITE_EXPIRY_DAYS: rawExtra.inviteExpiryDays ?? 7,
  INVITE_LIMIT_PER_DAY: rawExtra.inviteLimitPerDay ?? 20,
} as const;
