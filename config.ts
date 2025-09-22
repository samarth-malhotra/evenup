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
};

const extra = ((Constants.expoConfig && Constants.expoConfig.extra) ||
  (Constants.manifest && (Constants.manifest as any).extra) ||
  {}) as Extra;

export const CONFIG = {
  API_URL: extra.apiUrl ?? 'https://api.evenup.com',
  FEATURE_NEW_SUMMARY:
    (extra.featureNewSummary === true || extra.featureNewSummary === 'true') ?? false,
  SENTRY_DSN: extra.sentryDsn ?? '',
  ENV: extra.env ?? 'development',
  APP_VERSION: extra.appVersion ?? '1.0.0',
  IOS_BUILD_NUMBER: String(extra.iosBuildNumber ?? '1'),
  ANDROID_VERSION_CODE: Number(extra.androidVersionCode ?? 1),
} as const;

export type Config = typeof CONFIG;
