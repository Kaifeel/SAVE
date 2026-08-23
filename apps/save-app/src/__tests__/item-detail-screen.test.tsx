import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ItemDetailScreen from '@/app/(authenticated)/items/[id]';
import { ApiError } from '@/api/client';
import { getItem, setWishlist } from '@/catalog/api';
import { catalogItem } from '@/test-utils/catalog-fixtures';

const mockBack = jest.fn();
let mockRouteId = '7';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/catalog/api', () => ({
  getItem: jest.fn(),
  setWishlist: jest.fn(),
}));

const getItemMock = jest.mocked(getItem);
const setWishlistMock = jest.mocked(setWishlist);

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteId = '7';
  getItemMock.mockResolvedValue(catalogItem);
  setWishlistMock.mockResolvedValue(undefined);
});

it('renders only API-provided detail values and the actual photo count', async () => {
  getItemMock.mockResolvedValue({
    ...catalogItem,
    imageUrls: ['https://img.test/one.jpg', 'https://img.test/two.jpg'],
  });
  await render(<ItemDetailScreen />);

  expect(await screen.findByText('1 / 2')).toBeTruthy();
  expect(screen.getByText(catalogItem.title)).toBeTruthy();
  expect(screen.getByText(catalogItem.description)).toBeTruthy();
  expect(screen.getByText(catalogItem.ownerName)).toBeTruthy();
  expect(screen.queryByText('#카메라')).toBeNull();
  expect(screen.queryByText('거래 42회')).toBeNull();
});

it('uses a neutral placeholder and omits the counter when there are no photos', async () => {
  await render(<ItemDetailScreen />);

  expect(await screen.findByLabelText('등록된 사진 없음')).toBeTruthy();
  expect(screen.queryByText(/1 \/ /)).toBeNull();
});

it('does not fetch an invalid route id and offers back navigation', async () => {
  mockRouteId = 'invalid';
  await render(<ItemDetailScreen />);

  expect(await screen.findByText('물품을 찾을 수 없습니다.')).toBeTruthy();
  expect(getItemMock).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '뒤로가기' }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('shows a not-found state for a 404 response', async () => {
  getItemMock.mockRejectedValue(new ApiError('missing', 404));
  await render(<ItemDetailScreen />);
  expect(await screen.findByText('물품을 찾을 수 없습니다.')).toBeTruthy();
});

it('updates wishlist through the server and then refetches authoritative detail', async () => {
  getItemMock
    .mockResolvedValueOnce(catalogItem)
    .mockResolvedValueOnce({ ...catalogItem, wishlisted: true, wishlistCount: 2 });
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);

  await fireEvent.press(screen.getByRole('button', { name: '찜하기' }));

  await waitFor(() => expect(setWishlistMock).toHaveBeenCalledWith(7, true));
  expect(await screen.findByRole('button', { name: '찜 해제' })).toBeTruthy();
  expect(screen.getByText('찜 2')).toBeTruthy();
});

it('keeps server truth and displays a non-destructive error when wishlist fails', async () => {
  setWishlistMock.mockRejectedValue(new Error('offline'));
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);

  await fireEvent.press(screen.getByRole('button', { name: '찜하기' }));

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: '찜하기' })).toBeTruthy();
});
