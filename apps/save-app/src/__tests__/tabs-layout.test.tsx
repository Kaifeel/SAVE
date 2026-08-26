import { render, screen } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';

import TabsLayout from '@/app/(authenticated)/(tabs)/_layout';

type ScreenOptions = (context: { route: { name: string } }) => {
  tabBarIcon: (props: { color: string; focused: boolean }) => ReactElement;
};

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  function MockTabs({ screenOptions }: PropsWithChildren<{ screenOptions: ScreenOptions }>) {
    return React.createElement(
      React.Fragment,
      null,
      ['index', 'explore', 'create', 'chat', 'my'].map(route =>
        React.cloneElement(
          screenOptions({ route: { name: route } }).tabBarIcon({
            color: route === 'index' ? '#4f46e5' : '#94a3b8',
            focused: route === 'index',
          }),
          { key: route },
        ),
      ),
    );
  }

  MockTabs.Screen = function MockScreen() { return null; };
  return { Tabs: MockTabs };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

it('renders graphical navigation icons and the raised compose action', async () => {
  await render(<TabsLayout />);

  expect(screen.getByTestId('tab-icon-home')).toBeTruthy();
  expect(screen.getByTestId('tab-icon-explore')).toBeTruthy();
  expect(screen.getByTestId('tab-icon-chat')).toBeTruthy();
  expect(screen.getByTestId('tab-icon-my')).toBeTruthy();
  expect(screen.getByTestId('tab-icon-create')).toBeTruthy();
  expect(screen.getByTestId('tab-active-dot-home')).toBeTruthy();
  expect(screen.queryByText('⌂')).toBeNull();
  expect(screen.queryByText('⌕')).toBeNull();
  expect(screen.queryByText('◌')).toBeNull();
  expect(screen.queryByText('●')).toBeNull();
});
