import { act, cleanup, render } from '@testing-library/react-native';

import MyScreen from '@/app/(authenticated)/(tabs)/my';
import { useAuthStore } from '@/auth/store';
import { useMyPage } from '@/profile/use-my-page';

let mockFocusEffect: (() => void) | undefined;
const refresh = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    const firstRegistration = mockFocusEffect === undefined;
    mockFocusEffect = effect;
    if (firstRegistration) effect();
  },
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/auth/store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/profile/use-my-page', () => ({ useMyPage: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockFocusEffect = undefined;
  jest.mocked(useAuthStore).mockImplementation(selector => selector({
    user: null,
    logout: jest.fn(),
  } as never));
  jest.mocked(useMyPage).mockReturnValue({
    profile: { data: null, loading: false, error: null },
    items: { data: [], loading: false, error: null },
    wishlist: { data: [], loading: false, error: null },
    refreshing: false,
    reload: jest.fn(),
    refresh,
  });
});

afterEach(cleanup);

it('refreshes profile data when the mounted my tab regains focus', async () => {
  render(<MyScreen />);
  expect(mockFocusEffect).toBeDefined();
  expect(refresh).not.toHaveBeenCalled();

  await act(async () => mockFocusEffect?.());

  expect(refresh).toHaveBeenCalledTimes(1);
});
