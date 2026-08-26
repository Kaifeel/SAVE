import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import ChatScreen from '@/app/(authenticated)/(tabs)/chat';
import { getItem } from '@/catalog/api';
import { useChatStore } from '@/chat/store';
import type { ChatRoom } from '@/chat/types';

const mockPush = jest.fn();
let focusEffect: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => { focusEffect = effect; },
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/catalog/api', () => ({ getItem: jest.fn() }));
jest.mock('@/chat/store', () => ({ useChatStore: jest.fn() }));

const useChatStoreMock = jest.mocked(useChatStore);
const getItemMock = jest.mocked(getItem);
const loadRooms = jest.fn().mockResolvedValue(undefined);

const room: ChatRoom = {
  id: 7,
  itemId: 11,
  itemTitle: '서버 삼각대',
  opponentId: 4,
  opponentName: '김상대',
  lastMessage: '안녕하세요',
  lastMessageAt: '2026-08-23T16:00:00',
  unreadCount: 2,
};

function renderState(overrides: Record<string, unknown> = {}) {
  const state = {
    rooms: [room],
    loadingRooms: false,
    roomsError: null,
    loadRooms,
    ...overrides,
  };
  useChatStoreMock.mockImplementation(selector => selector(state as never));
  return render(<ChatScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  focusEffect = undefined;
  loadRooms.mockResolvedValue(undefined);
  getItemMock.mockReturnValue(new Promise(() => undefined));
});

it('refreshes rooms whenever the chat tab receives focus', async () => {
  await renderState();
  expect(focusEffect).toBeDefined();

  await act(async () => focusEffect?.());
  await act(async () => focusEffect?.());

  expect(loadRooms).toHaveBeenCalledTimes(2);
});

it('shows the linked item photo instead of the opponent initial', async () => {
  let resolveItem: ((value: Awaited<ReturnType<typeof getItem>>) => void) | undefined;
  getItemMock.mockReturnValue(new Promise(resolve => { resolveItem = resolve; }));
  await renderState();

  await act(async () => resolveItem?.({
    id: 11,
    ownerId: 9,
    ownerName: '판매자',
    ownerUniversityId: 1,
    ownerUniversityName: '부경대학교',
    type: 'LEND',
    title: '서버 삼각대',
    rentalFee: 2000,
    rentalUnit: 'DAY',
    pickupLocationId: 2,
    pickupLocationName: '중앙도서관',
    description: '튼튼한 삼각대',
    precautions: null,
    status: 'AVAILABLE',
    imageUrls: ['https://example.com/tripod.jpg'],
    viewCount: 3,
    wishlistCount: 1,
    wishlisted: false,
    ownerRating: 4.8,
    reviewCount: 2,
    createdAt: '2026-08-22T12:00:00',
    updatedAt: '2026-08-22T12:00:00',
  }));

  expect(screen.getByLabelText('서버 삼각대 물품 사진')).toHaveProp('source', {
    uri: 'https://example.com/tripod.jpg',
  });
  expect(screen.queryByText('김')).toBeNull();
});

afterEach(cleanup);

it('renders a loading state', async () => {
  await renderState({ rooms: [], loadingRooms: true });
  expect(screen.getByLabelText('채팅 목록 불러오는 중')).toBeTruthy();
});

it('renders an empty state without sample chat records', async () => {
  await renderState({ rooms: [] });
  expect(screen.getByText('아직 시작된 채팅이 없습니다.')).toBeTruthy();
  expect(screen.queryByText('테스트 채팅')).toBeNull();
});

it('shows a retry action for a room-list failure', async () => {
  await renderState({ rooms: [], roomsError: '채팅 목록을 불러오지 못했습니다.' });

  expect(screen.getByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
  expect(loadRooms).toHaveBeenCalled();
});

it('shows unread server data and navigates to the selected room', async () => {
  await renderState();

  expect(screen.getByLabelText('읽지 않은 메시지 2개')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /김상대.*서버 삼각대/ }));

  expect(mockPush).toHaveBeenCalledWith({ pathname: '/chats/[id]', params: { id: '7' } });
});
