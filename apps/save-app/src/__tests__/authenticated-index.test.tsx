import { render } from '@testing-library/react-native';

import { useAuthStore } from '@/auth/store';
import Index from '@/app/(authenticated)/index';

const mockRedirect = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

jest.mock('@/auth/store', () => ({ useAuthStore: jest.fn() }));

const mockUseAuthStore = jest.mocked(useAuthStore);

it('opens profile setup when a Google user has no department', () => {
  mockUseAuthStore.mockImplementation(selector => selector({
    user: { department: null, universityId: 1 },
  } as never));

  render(<Index />);

  expect(mockRedirect).toHaveBeenLastCalledWith('/(authenticated)/profile-setup');
});

it('opens the tabs when the member profile is complete', () => {
  mockUseAuthStore.mockImplementation(selector => selector({
    user: { department: '컴퓨터공학과', universityId: 1 },
  } as never));

  render(<Index />);

  expect(mockRedirect).toHaveBeenLastCalledWith('/(authenticated)/(tabs)');
});
