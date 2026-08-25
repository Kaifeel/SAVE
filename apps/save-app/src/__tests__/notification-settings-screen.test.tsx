import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import NotificationSettingsScreen from '@/app/(authenticated)/notification-settings';
import { useAuthStore } from '@/auth/store';
import {
  getPushNotificationSettings,
  setPushNotificationsEnabled,
  type PushNotificationSettings,
} from '@/notifications/registration';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('@/auth/store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/notifications/registration', () => ({
  getPushNotificationSettings: jest.fn(),
  setPushNotificationsEnabled: jest.fn(),
}));

const useAuthStoreMock = jest.mocked(useAuthStore);
const getSettings = jest.mocked(getPushNotificationSettings);
const setEnabled = jest.mocked(setPushNotificationsEnabled);

const enabledSettings: PushNotificationSettings = {
  supported: true,
  preferenceEnabled: true,
  permissionGranted: true,
  permissionStatus: 'granted' as PushNotificationSettings['permissionStatus'],
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStoreMock.mockImplementation(selector => selector({ accessToken: 'jwt' } as never));
  getSettings.mockResolvedValue(enabledSettings);
  setEnabled.mockResolvedValue({
    ...enabledSettings,
    preferenceEnabled: false,
    permissionGranted: true,
  });
});

it('loads the current state and disables push for this device', async () => {
  await render(<NotificationSettingsScreen />);

  const toggle = await screen.findByRole('switch', { name: '푸시 알림' });
  expect(toggle.props.value).toBe(true);
  await act(async () => {
    fireEvent(toggle, 'valueChange', false);
  });

  await waitFor(() => expect(setEnabled).toHaveBeenCalledWith(false, 'jwt'));
});

it('opens system settings when notification permission is denied', async () => {
  getSettings.mockResolvedValue({
    supported: true,
    preferenceEnabled: true,
    permissionGranted: false,
    permissionStatus: 'denied' as PushNotificationSettings['permissionStatus'],
  });
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  await render(<NotificationSettingsScreen />);

  fireEvent.press(await screen.findByRole('button', { name: '휴대폰 설정 열기' }));
  expect(openSettings).toHaveBeenCalledTimes(1);
});
