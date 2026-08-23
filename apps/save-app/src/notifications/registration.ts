import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { registerDeviceToken, unregisterDeviceToken } from './api';
import type { DevicePlatform } from './api';

const PUSH_TOKEN_KEY = 'save.expoPushToken';
const DEFAULT_CHANNEL = 'default';

let currentPushToken: string | null = null;

export type PushRegistration = {
  token: string;
  remove: () => void;
};

function projectId(): string {
  const id = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Expo EAS project ID is not configured');
  }
  return id;
}

function permissionGranted(permission: Notifications.NotificationPermissionsStatus): boolean {
  if (permission.status === 'granted') return true;
  const iosStatus = permission.ios?.status;
  return iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED
    || iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
    || iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL, {
      name: '일반 알림',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permissionGranted(permission)) {
    permission = await Notifications.requestPermissionsAsync();
  }
  return permissionGranted(permission);
}

function devicePlatform(): DevicePlatform | null {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return null;
}

async function obtainAndRegisterToken(
  accessToken: string,
  platform: DevicePlatform,
  easProjectId: string,
): Promise<string> {
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data;
  await registerDeviceToken(token, platform, accessToken);
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  currentPushToken = token;
  return token;
}

export async function registerForPushNotifications(
  accessToken: string,
): Promise<PushRegistration | null> {
  const platform = devicePlatform();
  if (!platform || !Device.isDevice) return null;
  if (!await ensurePermission()) return null;

  const easProjectId = projectId();
  const token = await obtainAndRegisterToken(accessToken, platform, easProjectId);
  const subscription = Notifications.addPushTokenListener(() => {
    void obtainAndRegisterToken(accessToken, platform, easProjectId).catch(() => undefined);
  });

  return { token, remove: () => subscription.remove() };
}

export async function unregisterCurrentPushToken(accessToken: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const token = currentPushToken ?? await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await unregisterDeviceToken(token, accessToken);
  } finally {
    currentPushToken = null;
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  }
}
