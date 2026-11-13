import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import TabsLayout from '@/app/(authenticated)/(tabs)/_layout';

type ScreenOptions = (context: { route: { name: string } }) => {
  tabBarIcon: (props: { color: string; focused: boolean }) => ReactElement;
  tabBarStyle: object;
};

const mockReplace = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0, top: 24 }),
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');

  function MockTabs({ children, screenOptions }: PropsWithChildren<{ screenOptions: ScreenOptions }>) {
    const tabBarStyle = screenOptions({ route: { name: 'index' } }).tabBarStyle;

    return React.createElement(
      React.Fragment,
      null,
      <View testID="tab-bar-style" style={tabBarStyle} />,
      ['index', 'explore', 'create', 'chat', 'my'].map(route =>
        React.cloneElement(
          screenOptions({ route: { name: route } }).tabBarIcon({
            color: route === 'index' ? '#4f46e5' : '#94a3b8',
            focused: route === 'index',
          }),
          { key: route },
        ),
      ),
      children,
    );
  }

  MockTabs.Screen = function MockScreen({ listeners, name }: {
    listeners?: { tabPress?: (event: { preventDefault: () => void }) => void };
    name: string;
  }) {
    if (name !== 'create') return null;
    return (
      <Pressable
        accessibilityLabel="글쓰기 탭 누르기"
        accessibilityRole="button"
        onPress={() => listeners?.tabPress?.({ preventDefault: jest.fn() })}
      />
    );
  };
  return { Tabs: MockTabs, useRouter: () => ({ replace: mockReplace }) };
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

it('keeps tab content above the Android bottom safe area', async () => {
  await render(<TabsLayout />);

  expect(StyleSheet.flatten(screen.getByTestId('tab-bar-style').props.style)).toMatchObject({
    height: 98,
    paddingBottom: 34,
  });
});

it('opens a fresh compose route without a stale edit item id', async () => {
  await render(<TabsLayout />);

  fireEvent.press(screen.getByRole('button', { name: '글쓰기 탭 누르기' }));

  expect(mockReplace).toHaveBeenCalledWith('/create');
});
