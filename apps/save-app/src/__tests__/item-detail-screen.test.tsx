import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ItemDetailScreen from '@/app/(authenticated)/(tabs)/items/[id]';
import { Alert, Share } from 'react-native';
import { ApiError } from '@/api/client';
import { deleteItem, getItem, setWishlist } from '@/catalog/api';
import { COMMON_SAFETY_NOTICE } from '@/catalog/constants';
import { createOrGetChatRoom } from '@/chat/api';
import { createRental } from '@/rentals/api';
import type { Rental } from '@/rentals/types';
import { catalogItem } from '@/test-utils/catalog-fixtures';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
let mockRouteId = '7';
let mockCurrentUserId = 1;
const mockSafeAreaInsets = { top: 24, right: 0, bottom: 0, left: 0 };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ back: mockBack, navigate: mockNavigate, push: mockPush, replace: mockReplace }),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return { ...actual, useSafeAreaInsets: () => mockSafeAreaInsets };
});

jest.mock('@/catalog/api', () => ({
  getItem: jest.fn(),
  setWishlist: jest.fn(),
  deleteItem: jest.fn(),
}));

jest.mock('@/chat/api', () => ({ createOrGetChatRoom: jest.fn() }));
jest.mock('@/chat/store', () => ({
  useChatStore: { getState: () => ({ loadRooms: jest.fn().mockResolvedValue(undefined) }) },
}));
jest.mock('@/rentals/api', () => ({ createRental: jest.fn() }));
jest.mock('@/auth/store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: { id: mockCurrentUserId },
  }),
}));

const getItemMock = jest.mocked(getItem);
const setWishlistMock = jest.mocked(setWishlist);
const deleteItemMock = jest.mocked(deleteItem);
const createOrGetChatRoomMock = jest.mocked(createOrGetChatRoom);
const createRentalMock = jest.mocked(createRental);

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteId = '7';
  mockCurrentUserId = 1;
  getItemMock.mockResolvedValue(catalogItem);
  setWishlistMock.mockResolvedValue(undefined);
  deleteItemMock.mockResolvedValue(undefined);
  createOrGetChatRoomMock.mockResolvedValue({ id: 44, itemId: 7 });
  createRentalMock.mockResolvedValue({ id: 41 } as Rental);
});

it('renders only API-provided detail values and the actual photo count', async () => {
  getItemMock.mockResolvedValue({
    ...catalogItem,
    imageUrls: ['https://img.test/one.jpg', 'https://img.test/two.jpg'],
  });
  await render(<ItemDetailScreen />);

  expect(await screen.findByLabelText('사진 1/2')).toBeTruthy();
  expect(screen.getByLabelText('물품 사진 1').props.style).toEqual(expect.objectContaining({
    resizeMode: 'contain',
  }));
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

it('opens the API-provided owner public profile', async () => {
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);

  await fireEvent.press(screen.getByRole('button', { name: `${catalogItem.ownerName} 프로필 보기` }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/users/[id]',
    params: { id: String(catalogItem.ownerId) },
  });
});

it('keeps the common safety notice when the API has no item-specific precaution', async () => {
  getItemMock.mockResolvedValue({ ...catalogItem, precautions: null });
  await render(<ItemDetailScreen />);
  expect(await screen.findByText(COMMON_SAFETY_NOTICE)).toBeTruthy();
});

it('creates a room and opens chat from the item action', async () => {
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);
  await fireEvent.press(screen.getByRole('button', { name: '채팅하기' }));
  await waitFor(() => expect(createOrGetChatRoomMock).toHaveBeenCalledWith(7));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/chats/[id]', params: { id: '44' } });
});

it('creates a room and submits a validated rental period', async () => {
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);
  await fireEvent.press(screen.getByRole('button', { name: '대여 요청' }));
  expect(await screen.findByLabelText('대여 시작 시간')).toBeTruthy();
  expect(screen.getByLabelText('대여 종료 시간')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '대여 요청 보내기' }));
  await waitFor(() => expect(createRentalMock).toHaveBeenCalledWith({
    itemId: 7,
    chatRoomId: 44,
    startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/),
    endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/),
    totalPrice: 3000,
  }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/rentals/[id]', params: { id: '41' } });
});

it('opens the native share sheet for the current item', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);
  await fireEvent.press(screen.getByRole('button', { name: '게시글 공유' }));
  expect(share).toHaveBeenCalledWith(expect.objectContaining({
    message: expect.stringContaining(`saveapp://items/${catalogItem.id}`),
  }));
});

it('offers the owner an edit action that opens the item editor', async () => {
  mockCurrentUserId = catalogItem.ownerId;
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);

  await fireEvent.press(screen.getByRole('button', { name: '수정' }));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/create',
    params: { itemId: String(catalogItem.id) },
  });
  expect(screen.queryByText('내가 등록한 물품입니다.')).toBeNull();
});

it('confirms and deletes an owned item before returning home', async () => {
  mockCurrentUserId = catalogItem.ownerId;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find(button => button.text === '삭제')?.onPress?.();
  });
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);

  await fireEvent.press(screen.getByRole('button', { name: '삭제' }));

  expect(alert).toHaveBeenCalledWith(
    '게시물 삭제',
    '이 게시물을 삭제하시겠습니까?',
    expect.any(Array),
  );
  await waitFor(() => expect(deleteItemMock).toHaveBeenCalledWith(catalogItem.id));
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('places the detail header below the Android status bar inset', async () => {
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);

  expect(screen.getByTestId('item-detail-header').props.style).toEqual(expect.objectContaining({
    top: 36,
  }));
});

it('uses vector icons instead of mismatched text glyphs for header actions', async () => {
  await render(<ItemDetailScreen />);
  await screen.findByText(catalogItem.title);

  expect(screen.queryByText('←')).toBeNull();
  expect(screen.queryByText('↗')).toBeNull();
  expect(screen.queryByText('♡')).toBeNull();
});
