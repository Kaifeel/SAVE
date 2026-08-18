import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ExploreScreen from '@/app/(authenticated)/(tabs)/explore';
import { useAuthStore } from '@/auth/store';
import { listItems } from '@/catalog/api';
import { catalogItem, catalogPage } from './catalog-fixtures';

const mockPush = jest.fn();
let mockRouteQuery = '';

jest.mock('expo-router', () => ({
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
