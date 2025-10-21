// app.config.js
import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

// Choose env file based on APP_ENV (dev/staging/production) or NODE_ENV fallback
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const envFile = path.resolve(process.cwd(), `.env.${APP_ENV}`);

// load base .env first if exists
const baseEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(baseEnvPath)) {
  dotenv.config({ path: baseEnvPath });
}

// load environment-specific file if exists
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  // fallback to plain .env if specific env file not present (already loaded above)
  // or you can warn in CI if required
  // console.warn(`Env file ${envFile} not found, using .env or process.env values`);
}

export default ({ config }) => {
  const version = process.env.APP_VERSION || config.version || '1.0.0';
  const iosBuildNumber = process.env.IOS_BUILD_NUMBER || config.ios?.buildNumber || '1';
  const androidVersionCode = Number(
    process.env.ANDROID_VERSION_CODE || config.android?.versionCode || 1
  );

  return {
    ...config,
    name: process.env.EXPO_APP_NAME || 'Evenup',
    slug: process.env.EXPO_SLUG || config.slug || 'demo',
    scheme: 'evenup',
    version,
    orientation: config.orientation || 'portrait',
    icon: config.icon || './src/assets/icon.png',
    userInterfaceStyle: config.userInterfaceStyle || 'light',
    platforms: ['ios', 'android', 'web'],
    splash: config.splash || {
      image: './src/assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      ...(config.ios || {}),
      supportsTablet: true,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || 'com.evenup.app',
      buildNumber: iosBuildNumber,
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ['evenup'],
          },
        ],
        NSContactsUsageDescription: 'Used to find friends from your contacts who are using EvenUp',
      },
      entitlements: {
        'com.apple.developer.associated-domains': ['applinks:evenup.com'],
      },
    },
    android: {
      ...(config.android || {}),
      package: process.env.ANDROID_PACKAGE || 'com.evenup.app',
      versionCode: androidVersionCode,
      adaptiveIcon: config.android?.adaptiveIcon || {
        foregroundImage: './src/assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      permissions: ['READ_CONTACTS'],
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'https',
              host: 'evenup.com',
              pathPrefix: '/',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      ...(config.web || {}),
      favicon: config.web?.favicon || './src/assets/favicon.png',
      bundler: 'metro',
      output: 'single',
    },
    plugins: config.plugins || ['expo-router', 'expo-font', 'expo-secure-store'],
    // Important: expo.extra exposes values to runtime via expo-constants
    extra: {
      // non-secret config
      apiUrl: process.env.API_URL || 'https://api.evenup.com',
      featureNewSummary: (process.env.FEATURE_NEW_SUMMARY || 'false') === 'true',
      env: APP_ENV,

      // IMPORTANT: for secrets you should prefer EAS/CI secrets — these may be set in process.env at build time
      sentryDsn: process.env.SENTRY_DSN || '',

      // versioning metadata
      appVersion: version,
      iosBuildNumber,
      androidVersionCode,

      // Supabase
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      inviteExpiryDays: process.env.INVITE_EXPIRY_DAYS,
      inviteLimitPerDay: process.env.INVITE_LIMIT_PER_DAY,
      contactsMatchEndpoint: process.env.CONTACTS_MATCH_ENDPOINT,
      groupInvitesEndpoint: process.env.GROUPS_INVITE_ENDPOINT,
      acceptInviteEndpoint: process.env.ACCEPT_INVITE_ENDPOINT,
      resendInviteEndpoint: process.env.RESEND_INVITE_ENDPOINT,
    },
    // If you use EAS updates, set the URL via env or leave as is
    updates: {
      url: process.env.EAS_UPDATE_URL || config.updates?.url,
    },
  };
};
