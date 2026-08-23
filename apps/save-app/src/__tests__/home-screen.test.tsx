import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(authenticated)/(tabs)';
import { useAuthStore } from '@/auth/store';
import {
  createRecommendation,
  getRecommendationHistory,
  listItems,
} from '@/catalog/api';
import { catalogItem, catalogPage, recommendation } from '@/test-utils/catalog-fixtures';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/catalog/api', () => ({
  createRecommendation: jest.fn(),
  getRecommendationHistory: jest.fn(),
  listItems: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);
const listItemsMock = jest.mocked(listItems);
const historyMock = jest.mocked(getRecommendationHistory);
const createRecommendationMock = jest.mocked(createRecommendation);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuthStore.mockImplementation(selector => selector({
    user: {
      id: 3,
      department: '컴퓨터공학과',
      universityId: 1,
    },
  } as never));
  listItemsMock.mockResolvedValue(catalogPage());
  historyMock.mockResolvedValue([recommendation]);
  createRecommendationMock.mockResolvedValue(recommendation);
});

it('renders the web-reference sections in order from server data', async () => {
  await render(<HomeScreen />);

  expect(await screen.findByText('오늘의 AI 추천 물품')).toBeTruthy();
  expect(screen.getByText('인기 대여 물품')).toBeTruthy();
  expect(screen.getByText('방금 올라왔어요')).toBeTruthy();
  expect(screen.getAllByText('서버 삼각대').length).toBeGreaterThan(0);
  expect(listItemsMock).toHaveBeenCalledWith(expect.objectContaining({ sort: 'popular' }));
  expect(listItemsMock).toHaveBeenCalledWith(expect.objectContaining({ sort: 'latest' }));
});

it('does not replace an empty recommendation with catalog items', async () => {
  historyMock.mockResolvedValue([]);
  await render(<HomeScreen />);

  expect(await screen.findByRole('button', { name: 'AI 추천 받기' })).toBeTruthy();
  expect(screen.queryByText('오늘 필요한 물품')).toBeNull();
});

it('opens explore with the entered query and opens item detail', async () => {
  await render(<HomeScreen />);
  await screen.findByText('인기 대여 물품');

  await fireEvent.changeText(screen.getByPlaceholderText('빌리고 싶은 물건을 검색하세요'), '렌즈 가방');
  await fireEvent.press(screen.getByRole('button', { name: '검색' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/explore', params: { query: '렌즈 가방' } });

  await fireEvent.press(screen.getAllByRole('button', { name: `${catalogItem.title} 상세 보기` })[0]);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/items/[id]', params: { id: '7' } });
});

it('shows a retry action without rendering fabricated records after a request failure', async () => {
  listItemsMock.mockRejectedValueOnce(new Error('offline'));
  await render(<HomeScreen />);

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  expect(screen.queryByText('가짜 추천')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(listItemsMock).toHaveBeenCalledTimes(4));
});
