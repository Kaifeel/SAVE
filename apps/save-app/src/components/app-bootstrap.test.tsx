import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { useAuthStore } from '@/auth/store';

import { AppBootstrap } from './app-bootstrap';

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  hide: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);
const bootstrap = jest.fn<Promise<void>, []>();
const retryBootstrap = jest.fn<Promise<void>, []>();

type BootstrapState = {
  status: 'hydrating' | 'authenticated' | 'unauthenticated' | 'offline';
  bootstrap: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
};

async function renderBootstrap(status: BootstrapState['status'], children?: ReactNode) {
  const state: BootstrapState = { status, bootstrap, retryBootstrap };
  mockUseAuthStore.mockImplementation(selector => selector(state as never));

  return render(<AppBootstrap>{children}</AppBootstrap>);
}

beforeEach(() => {
  jest.clearAllMocks();
  bootstrap.mockResolvedValue(undefined);
  retryBootstrap.mockResolvedValue(undefined);
});

it('shows progress and withholds children while the auth session hydrates', async () => {
  await renderBootstrap('hydrating', <Text>protected route tree</Text>);

  expect(screen.getByLabelText('로그인 상태 확인 중')).toBeTruthy();
  expect(screen.queryByText('protected route tree')).toBeNull();
});

it('shows a retryable network error while bootstrap is offline', async () => {
  await renderBootstrap('offline', <Text>protected route tree</Text>);

  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByText('네트워크 연결을 확인해주세요.')).toBeTruthy();
  expect(screen.queryByText('protected route tree')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));

  expect(retryBootstrap).toHaveBeenCalledTimes(1);
});

it.each(['unauthenticated', 'authenticated'] as const)(
  'renders children once auth is %s',
  async status => {
    await renderBootstrap(status, <Text>protected route tree</Text>);

    expect(screen.getByText('protected route tree')).toBeTruthy();
  },
);
