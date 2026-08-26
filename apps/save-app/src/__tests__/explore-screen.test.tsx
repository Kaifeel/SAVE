import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ExploreScreen from '@/app/(authenticated)/(tabs)/explore';
import { useAuthStore } from '@/auth/store';
import { listItems } from '@/catalog/api';
import { catalogItem, catalogPage } from '@/test-utils/catalog-fixtures';

const mockPush = jest.fn();
let mockRouteQuery = '';
let mockFocusEffect: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    const firstRegistration = mockFocusEffect === undefined;
    mockFocusEffect = effect;
    if (firstRegistration) effect();
  },
  useLocalSearchParams: () => ({ query: mockRouteQuery }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/catalog/api', () => ({
  listItems: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);
const listItemsMock = jest.mocked(listItems);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRouteQuery = '';
  mockFocusEffect = undefined;
  mockUseAuthStore.mockImplementation(selector => selector({
    user: { universityId: 1 },
  } as never));
  listItemsMock.mockResolvedValue(catalogPage());
});

afterEach(() => {
  jest.useRealTimers();
});

async function flushSearch() {
  await act(async () => {
    jest.advanceTimersByTime(350);
  });
}

it('sends the route query, board, and availability filters to the server', async () => {
  mockRouteQuery = '초기 검색';
  await render(<ExploreScreen />);
  await flushSearch();

  await waitFor(() => expect(listItemsMock).toHaveBeenCalledWith(expect.objectContaining({
    type: 'LEND', query: '초기 검색', onlyAvailable: false,
  })));

  await fireEvent.press(screen.getByRole('button', { name: '물품 빌리기' }));
  await fireEvent.changeText(screen.getByPlaceholderText('장소, 물품명 검색...'), '우산');
  await fireEvent(screen.getByRole('switch'), 'valueChange', true);
  await flushSearch();

  await waitFor(() => expect(listItemsMock).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'BORROW', query: '우산', onlyAvailable: true, universityId: 1,
  })));
});

it('refreshes the current filters when the mounted explore tab regains focus', async () => {
  await render(<ExploreScreen />);
  await flushSearch();
  expect(listItemsMock).toHaveBeenCalledTimes(1);
  expect(mockFocusEffect).toBeDefined();
  let resolveRefresh: ((value: ReturnType<typeof catalogPage>) => void) | undefined;
  listItemsMock.mockReturnValueOnce(new Promise(resolve => { resolveRefresh = resolve; }));

  await act(async () => {
    mockFocusEffect?.();
    resolveRefresh?.(catalogPage());
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(listItemsMock).toHaveBeenCalledTimes(2);
});

it('synchronizes a new route query when the mounted explore screen is reopened', async () => {
  mockRouteQuery = '첫 검색';
  const view = await render(<ExploreScreen />);
  await flushSearch();
  expect(screen.getByLabelText('탐색 검색어').props.value).toBe('첫 검색');

  mockRouteQuery = '두 번째 검색';
  view.rerender(<ExploreScreen />);

  expect(screen.getByLabelText('탐색 검색어').props.value).toBe('두 번째 검색');
  await flushSearch();
  await waitFor(() => expect(listItemsMock).toHaveBeenLastCalledWith(expect.objectContaining({
    query: '두 번째 검색',
  })));
});

it('shows a failed request, retries, and then shows an empty result distinctly', async () => {
  listItemsMock
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(catalogPage([]));
  await render(<ExploreScreen />);
  await flushSearch();

  expect(await screen.findByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));

  expect(await screen.findByText('등록된 물품이 없습니다.')).toBeTruthy();
});

it('opens the selected server item detail route', async () => {
  await render(<ExploreScreen />);
  await flushSearch();

  await screen.findByText(catalogItem.title);
  await fireEvent.press(screen.getByRole('button', { name: `${catalogItem.title} 상세 보기` }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/items/[id]', params: { id: '7' } });
});
