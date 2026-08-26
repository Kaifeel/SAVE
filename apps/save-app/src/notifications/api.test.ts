import { apiRequest } from '@/api/client';
import {
  getInAppNotifications,
  markAllInAppNotificationsRead,
  registerDeviceToken,
  unregisterDeviceToken,
} from './api';

jest.mock('@/api/client', () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = jest.mocked(apiRequest);

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockResolvedValue(undefined);
});

it('registers an Expo token for the authenticated platform', async () => {
  await registerDeviceToken('ExpoPushToken[demo]', 'ANDROID', 'access-token');

  expect(apiRequestMock).toHaveBeenCalledWith('/device-tokens', {
    method: 'PUT',
    accessToken: 'access-token',
    body: JSON.stringify({ token: 'ExpoPushToken[demo]', platform: 'ANDROID' }),
  });
});

it('unregisters the exact token before the access token is discarded', async () => {
  await unregisterDeviceToken('ExpoPushToken[demo]', 'access-token');

  expect(apiRequestMock).toHaveBeenCalledWith('/device-tokens', {
    method: 'DELETE',
    accessToken: 'access-token',
    params: { token: 'ExpoPushToken[demo]' },
  });
});

it('loads the authenticated user in-app notifications', async () => {
  apiRequestMock.mockResolvedValueOnce([]);

  await getInAppNotifications();

  expect(apiRequestMock).toHaveBeenCalledWith('/notifications');
});

it('marks every in-app notification as read', async () => {
  await markAllInAppNotificationsRead();

  expect(apiRequestMock).toHaveBeenCalledWith('/notifications/read-all', {
    method: 'PATCH',
  });
});
