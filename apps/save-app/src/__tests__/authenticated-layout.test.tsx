import { render, screen } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { useAuthStore } from '@/auth/store';

import RootLayout from '@/app/_layout';

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  function MockStack({ children }: PropsWithChildren) {
    return React.createElement(React.Fragment, null, children);
  }
  function MockProtected({ children, guard }: PropsWithChildren<{ guard: boolean }>) {
    return guard ? React.createElement(React.Fragment, null, children) : null;
  }
  function MockScreen({ name }: { name: string }) {
    return React.createElement('Text', null, name);
  }

  const Stack = Object.assign(MockStack, {
    Protected: MockProtected,
    Screen: MockScreen,
  });

  return { Stack };
});

jest.mock('@/components/app-bootstrap', () => ({
  AppBootstrap: function MockAppBootstrap({ children }: PropsWithChildren) {
    const React = jest.requireActual<typeof import('react')>('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/notifications/coordinator', () => ({
  NotificationCoordinator: () => null,
}));

const mockUseAuthStore = jest.mocked(useAuthStore);

it('places every signed-in route beneath one protected authenticated group', async () => {
  mockUseAuthStore.mockImplementation(selector =>
    selector({ status: 'authenticated' } as never),
  );

  await render(<RootLayout />);

  expect(screen.getByText('(authenticated)')).toBeTruthy();
  expect(screen.queryByText('index')).toBeNull();
  expect(screen.queryByText('(tabs)')).toBeNull();
});

it('keeps login and signup available only in the signed-out tree', async () => {
  mockUseAuthStore.mockImplementation(selector =>
    selector({ status: 'unauthenticated' } as never),
  );

  await render(<RootLayout />);

  expect(screen.getByText('login')).toBeTruthy();
  expect(screen.getByText('signup')).toBeTruthy();
  expect(screen.queryByText('(authenticated)')).toBeNull();
});
