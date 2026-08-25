import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import {
  pushNotificationsEnabled,
  registerForPushNotifications,
  setPushNotificationsEnabled,
  unregisterCurrentPushToken,
} from './registration';
import { registerDeviceToken, unregisterDeviceToken } from './api';

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'project-id' } } },
    easConfig: null,
  },
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: {
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('./api', () => ({
  registerDeviceToken: jest.fn(),
  unregisterDeviceToken: jest.fn(),
}));

const setChannel = jest.mocked(Notifications.setNotificationChannelAsync);
const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
const getExpoPushToken = jest.mocked(Notifications.getExpoPushTokenAsync);
const addPushTokenListener = jest.mocked(Notifications.addPushTokenListener);
const setItem = jest.mocked(SecureStore.setItemAsync);
const getItem = jest.mocked(SecureStore.getItemAsync);
const deleteItem = jest.mocked(SecureStore.deleteItemAsync);
const registerToken = jest.mocked(registerDeviceToken);
const unregisterToken = jest.mocked(unregisterDeviceToken);
const removeListener = jest.fn();

function setPlatform(os: 'android' | 'ios') {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatform('android');
  (Device as { isDevice: boolean }).isDevice = true;
  setChannel.mockResolvedValue(null);
  getPermissions.mockResolvedValue({ status: 'granted' } as Notifications.NotificationPermissionsStatus);
  requestPermissions.mockResolvedValue({ status: 'granted' } as Notifications.NotificationPermissionsStatus);
  getExpoPushToken.mockResolvedValue({ data: 'ExpoPushToken[first]', type: 'expo' });
  addPushTokenListener.mockReturnValue({ remove: removeListener });
  setItem.mockResolvedValue();
  getItem.mockResolvedValue(null);
  deleteItem.mockResolvedValue();
  registerToken.mockResolvedValue();
  unregisterToken.mockResolvedValue();
});

afterEach(async () => {
  await unregisterCurrentPushToken('test-cleanup');
});

it('does not request or register a push token on a non-physical device', async () => {
  (Device as { isDevice: boolean }).isDevice = false;

  await expect(registerForPushNotifications('access-token')).resolves.toBeNull();

  expect(setChannel).not.toHaveBeenCalled();
  expect(getPermissions).not.toHaveBeenCalled();
  expect(getExpoPushToken).not.toHaveBeenCalled();
  expect(registerToken).not.toHaveBeenCalled();
});

it('creates the Android channel before asking for notification permission', async () => {
  await registerForPushNotifications('access-token');

  expect(setChannel).toHaveBeenCalledWith('default', expect.objectContaining({
    name: '일반 알림',
    importance: Notifications.AndroidImportance.HIGH,
  }));
  expect(setChannel.mock.invocationCallOrder[0]).toBeLessThan(getPermissions.mock.invocationCallOrder[0]);
});

it('does nothing when notification permission is denied', async () => {
  getPermissions.mockResolvedValue({ status: 'denied' } as Notifications.NotificationPermissionsStatus);
  requestPermissions.mockResolvedValue({ status: 'denied' } as Notifications.NotificationPermissionsStatus);

  await expect(registerForPushNotifications('access-token')).resolves.toBeNull();

  expect(getExpoPushToken).not.toHaveBeenCalled();
  expect(registerToken).not.toHaveBeenCalled();
  expect(setItem).not.toHaveBeenCalled();
});

it('stores and registers the Expo token with the EAS project id', async () => {
  await expect(registerForPushNotifications('access-token')).resolves.toEqual(
    expect.objectContaining({ token: 'ExpoPushToken[first]' }),
  );

  expect(getExpoPushToken).toHaveBeenCalledWith({ projectId: 'project-id' });
  expect(registerToken).toHaveBeenCalledWith('ExpoPushToken[first]', 'ANDROID', 'access-token');
  expect(setItem).toHaveBeenCalledWith('save.expoPushToken', 'ExpoPushToken[first]');
});

it('re-registers the current Expo token when the native push token rotates', async () => {
  let onPushToken: (() => void) | undefined;
  addPushTokenListener.mockImplementation(listener => {
    onPushToken = () => { void listener({ type: 'fcm', data: 'rotated-native-token' }); };
    return { remove: removeListener };
  });
  getExpoPushToken
    .mockResolvedValueOnce({ data: 'ExpoPushToken[first]', type: 'expo' })
    .mockResolvedValueOnce({ data: 'ExpoPushToken[rotated]', type: 'expo' });

  await registerForPushNotifications('access-token');
  onPushToken?.();
  await new Promise<void>(resolve => setImmediate(resolve));

  expect(registerToken).toHaveBeenLastCalledWith(
    'ExpoPushToken[rotated]',
    'ANDROID',
    'access-token',
  );
  expect(setItem).toHaveBeenLastCalledWith('save.expoPushToken', 'ExpoPushToken[rotated]');
});

it('deletes the server token and local copy during logout', async () => {
  getItem.mockResolvedValue('ExpoPushToken[stored]');

  await unregisterCurrentPushToken('access-token');

  expect(unregisterToken).toHaveBeenCalledWith('ExpoPushToken[stored]', 'access-token');
  expect(deleteItem).toHaveBeenCalledWith('save.expoPushToken');
  expect(unregisterToken.mock.invocationCallOrder[0]).toBeLessThan(deleteItem.mock.invocationCallOrder[0]);
});

it('treats a missing preference as enabled and preserves an explicit disabled choice', async () => {
  getItem.mockResolvedValueOnce(null).mockResolvedValueOnce('false');

  await expect(pushNotificationsEnabled()).resolves.toBe(true);
  await expect(pushNotificationsEnabled()).resolves.toBe(false);
});

it('disables the current device token and persists the choice', async () => {
  getItem.mockImplementation(async key => key === 'save.expoPushToken'
    ? 'ExpoPushToken[stored]'
    : 'false');

  const settings = await setPushNotificationsEnabled(false, 'access-token');

  expect(unregisterToken).toHaveBeenCalledWith('ExpoPushToken[stored]', 'access-token');
  expect(setItem).toHaveBeenCalledWith('save.pushNotificationsEnabled', 'false');
  expect(settings.preferenceEnabled).toBe(false);
});

it('enables push only after permission and token registration succeed', async () => {
  getItem.mockImplementation(async key => key === 'save.pushNotificationsEnabled' ? 'true' : null);

  const settings = await setPushNotificationsEnabled(true, 'access-token');

  expect(registerToken).toHaveBeenCalledWith('ExpoPushToken[first]', 'ANDROID', 'access-token');
  expect(setItem).toHaveBeenCalledWith('save.pushNotificationsEnabled', 'true');
  expect(settings).toMatchObject({ preferenceEnabled: true, permissionGranted: true });
});
