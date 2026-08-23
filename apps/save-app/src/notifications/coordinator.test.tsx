import { render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { NotificationCoordinator, notificationRoute } from './coordinator';
import { runLogoutCleanup } from '@/auth/logout-cleanup';
import { registerForPushNotifications, unregisterCurrentPushToken } from './registration';

const mockPush = jest.fn();
let mockResponseListener: ((response: Notifications.NotificationResponse) => void) | undefined;
const mockRemoveResponseListener = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(listener => {
    mockResponseListener = listener;
    return { remove: mockRemoveResponseListener };
  }),
}));
jest.mock('./registration', () => ({
  registerForPushNotifications: jest.fn(),
  unregisterCurrentPushToken: jest.fn(),
}));

const register = jest.mocked(registerForPushNotifications);
const unregister = jest.mocked(unregisterCurrentPushToken);
const mockRegistrationRemove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockResponseListener = undefined;
  register.mockResolvedValue({ token: 'ExpoPushToken[demo]', remove: mockRegistrationRemove });
});

it.each([
  ['CHAT_MESSAGE', { type: 'CHAT_MESSAGE', roomId: 12 }, '/chats/[id]', '12'],
  ['RENTAL_REQUESTED', { type: 'RENTAL_REQUESTED', rentalId: 21 }, '/rentals/[id]', '21'],
  ['RENTAL_APPROVED', { type: 'RENTAL_APPROVED', rentalId: 22 }, '/rentals/[id]', '22'],
  ['RENTAL_REJECTED', { type: 'RENTAL_REJECTED', rentalId: 23 }, '/rentals/[id]', '23'],
  ['REVIEW_PUBLISHED', { type: 'REVIEW_PUBLISHED', rentalId: 24 }, '/rentals/[id]', '24'],
])('maps %s data to the real Expo Router screen', (_type, data, pathname, id) => {
  expect(notificationRoute(data)).toEqual({ pathname, params: { id } });
});

it.each([
  {},
  { type: 'UNKNOWN', rentalId: 1 },
  { type: 'CHAT_MESSAGE', roomId: 'not-an-id' },
  { type: 'RENTAL_APPROVED' },
])('does not navigate for unsupported or malformed data', data => {
  expect(notificationRoute(data)).toBeNull();
});

it('registers while mounted and routes a tapped notification', async () => {
  const view = await render(<NotificationCoordinator accessToken="access-token" />);
  await new Promise<void>(resolve => setImmediate(resolve));

  expect(register).toHaveBeenCalledWith('access-token');
  mockResponseListener?.({
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: {
      date: 1_787_473_800_000,
      request: {
        identifier: 'notification-id',
        trigger: { type: 'push', payload: {} },
        content: {
          title: '새 메시지',
          subtitle: null,
          body: '메시지가 도착했습니다.',
          data: { type: 'CHAT_MESSAGE', roomId: 9 },
          categoryIdentifier: null,
          sound: null,
          launchImageName: null,
          badge: null,
          attachments: [],
          threadIdentifier: null,
        },
      },
    },
  });
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/chats/[id]', params: { id: '9' } });

  await runLogoutCleanup('access-token');
  expect(unregister).toHaveBeenCalledWith('access-token');

  await view.unmount();
  expect(mockRegistrationRemove).toHaveBeenCalledTimes(1);
  expect(mockRemoveResponseListener).toHaveBeenCalledTimes(1);
});

it('keeps notification routing mounted when token registration fails', async () => {
  register.mockRejectedValue(new Error('permission service unavailable'));

  const view = await render(<NotificationCoordinator accessToken="access-token" />);
  await new Promise<void>(resolve => setImmediate(resolve));

  expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
  await view.unmount();
});
