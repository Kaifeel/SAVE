import { apiRequest } from '@/api/client';

export type DevicePlatform = 'ANDROID' | 'IOS';

export type InAppNotification = {
  id: number;
  type: string;
  rentalId: number;
  itemId: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
};

export function getInAppNotifications(): Promise<InAppNotification[]> {
  return apiRequest<InAppNotification[]>('/notifications');
}

export async function markAllInAppNotificationsRead(): Promise<void> {
  await apiRequest<void>('/notifications/read-all', { method: 'PATCH' });
}

export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
  accessToken: string,
): Promise<void> {
  await apiRequest<void>('/device-tokens', {
    method: 'PUT',
    accessToken,
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterDeviceToken(
  token: string,
  accessToken: string,
): Promise<void> {
  await apiRequest<void>('/device-tokens', {
    method: 'DELETE',
    accessToken,
    params: { token },
  });
}
