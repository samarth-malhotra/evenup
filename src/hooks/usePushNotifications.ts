// src/hooks/usePushNotifications.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase/supabase';

export async function callUpsertPushTokenEdge(opts: {
  url: string; // EXPO_PUBLIC_UPSERT_PUSH_TOKEN_URL
  user_id: string;
  token?: string | null;
  platform?: string | null;
  device_name: string;
  os_version: string;
}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  const { url, user_id, token = null, platform = null, device_name } = opts;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ user_id, token, platform, device_name }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('Edge function error:', json);
      return null;
    }
    return json;
  } catch (err) {
    console.error('Failed to call upsert push token edge function:', err);
    return null;
  }
}

const EDGE_FN_URL =
  'https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/upsert-push-token' as string;

// Keep your previous notification handler config
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
function getEventCategory(eventType: string) {
  const groupEvents = ['group_member_added', 'group_member_deleted', 'group_deleted'];

  const transactionEvents = ['expense_created', 'expense_deleted', 'expense_updated'];

  if (groupEvents.includes(eventType)) {
    return 'group';
  } else if (transactionEvents.includes(eventType)) {
    return 'transaction';
  } else {
    return 'unknown';
  }
}

export function usePushNotifications(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;

    let receivedSub: Notifications.EventSubscription | null = null;
    let responseSub: Notifications.EventSubscription | null = null;

    async function navigateFromNotificationData(data: any) {
      if (!data) return;
      const { router } = await import('expo-router');
      if (!router) return;
      const { subtype, group_id, expense_id } = data;
      const type = getEventCategory(subtype);
      console.log('activityType: ', subtype);
      if (type === 'group' && group_id) {
        router.push(`/(tabs)/groups/${group_id}`);
      } else if (type === 'transaction' && expense_id) {
        router.push(`/(tabs)/expenses/${expense_id}`);
      }
    }

    (async () => {
      try {
        if (!Device.isDevice) {
          console.warn('Push notifications require a real device (not a simulator).');
          return;
        }

        // Use Platform.OS for Android-specific logic (reliable)
        if (Platform.OS === 'android') {
          // create Android channel (id: 'default') — safe to call multiple times
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // Permissions flow
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Notification permissions not granted.');
          return;
        }

        // Get expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const expoPushToken = tokenData.data;
        console.log('Expo push token:', expoPushToken);

        // Platform (reliable)
        const platform: 'android' | 'ios' | string = Platform.OS;

        // Device metadata (preferred fields)
        // - modelName is the human-friendly model (e.g. "Galaxy A05", "iPhone 12")
        // - deviceName sometimes exists (user-assigned name) but is not always available
        // - manufacturer/modelId are last-resort fallbacks
        const deviceModel =
          Device.modelName ||
          (Device as any).deviceName ||
          `${Device.manufacturer ?? 'unknown-manufacturer'}${Device.modelId ? ` ${Device.modelId}` : ''}` ||
          'unknown-device';

        const osVersion = Device.osVersion ?? 'unknown-os-version';
        const isEmulator = !Device.isDevice;

        console.log(
          'platform:',
          platform,
          'osVersion:',
          osVersion,
          'deviceModel:',
          deviceModel,
          'isEmulator::',
          isEmulator
        );

        // Payload to upsert/store on server
        // const devicePayload = {
        //   platform,
        //   os_version: osVersion,
        //   model: deviceModel,
        //   is_emulator: isEmulator,
        //   token: expoPushToken,
        // };

        // Call edge function once to upsertIfNeeded (server decides whether to write)
        if (EDGE_FN_URL) {
          await callUpsertPushTokenEdge({
            url: EDGE_FN_URL,
            user_id: userId,
            token: expoPushToken,
            platform,
            device_name: deviceModel,
            os_version: osVersion,
          });
        } else {
          console.warn('UPsert Push Token Edge Function URL not configured.');
        }

        // handle cold-start notification
        const lastResponse = await Notifications.getLastNotificationResponse();
        if (lastResponse) {
          navigateFromNotificationData(lastResponse.notification.request.content.data);
        }

        // foreground receive (optional)
        receivedSub = Notifications.addNotificationReceivedListener((notification) => {
          console.log('Notification received while app open:', notification.request.content.data);
        });

        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          console.log('Notification response:', response.notification.request.content.data);
          navigateFromNotificationData(response.notification.request.content.data);
        });
      } catch (err) {
        console.error('usePushNotifications error:', err);
      }
    })();

    return () => {
      if (receivedSub) receivedSub.remove();
      if (responseSub) responseSub.remove();
    };
  }, [userId]);
}
