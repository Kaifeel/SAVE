import { apiRequest } from '@/api/client';

export type DevicePlatform = 'ANDROID' | 'IOS';

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
