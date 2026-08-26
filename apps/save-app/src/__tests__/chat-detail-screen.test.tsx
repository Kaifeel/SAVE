import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ChatDetailScreen from '@/app/(authenticated)/chats/[id]';
import { useAuthStore } from '@/auth/store';
import { getItem } from '@/catalog/api';
import { useChatStore } from '@/chat/store';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockRouteId = '7';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock('@/auth/store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/chat/store', () => ({ useChatStore: jest.fn() }));
jest.mock('@/catalog/api', () => ({ getItem: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  Feather: ({ name, ...props }: { name: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text {...props}>{name}</Text>;
  },
}));

const useAuthStoreMock = jest.mocked(useAuthStore);
const useChatStoreMock = jest.mocked(useChatStore);
const getItemMock = jest.mocked(getItem);
const openRoom = jest.fn().mockResolvedValue(undefined);
const closeRoom = jest.fn();
const loadOlder = jest.fn().mockResolvedValue(undefined);
const send = jest.fn().mockResolvedValue(undefined);
const retry = jest.fn().mockResolvedValue(undefined);
const connectRealtime = jest.fn();

const item = {
  id: 11,
  ownerId: 9,
  ownerName: '판매자',
  ownerUniversityId: 1,
  ownerUniversityName: '부경대학교',
  type: 'LEND' as const,
  title: '카메라 삼각대',
  rentalFee: 2000,
  rentalUnit: 'DAY',
  pickupLocationId: 2,
  pickupLocationName: '중앙도서관',
  description: '튼튼한 삼각대',
  precautions: null,
  status: 'AVAILABLE' as const,
  imageUrls: ['https://example.com/tripod.jpg'],
  viewCount: 3,
  wishlistCount: 1,
  wishlisted: false,
  ownerRating: 4.8,
  reviewCount: 2,
  createdAt: '2026-08-22T12:00:00',
  updatedAt: '2026-08-22T12:00:00',
};

function renderState(overrides: Record<string, unknown> = {}) {
  const state = {
    rooms: [{
      id: 7,
      itemId: 11,
      itemTitle: '서버 삼각대',
      opponentId: 4,
      opponentName: '김상대',
      lastMessage: '안녕하세요',
      lastMessageAt: '2026-08-23T16:00:00',
      unreadCount: 0,
    }],
    activeRoomId: 7,
    messages: [{
      id: 'client-1',
      clientId: 'client-1',
      roomId: 7,
      senderId: 3,
      senderName: '나',
      message: '전송 중 메시지',
      isRead: true,
      createdAt: '2026-08-23T16:01:00',
      deliveryStatus: 'sending',
    }, {
      id: 'client-2',
      clientId: 'client-2',
      roomId: 7,
      senderId: 3,
      senderName: '나',
      message: '실패 메시지',
      isRead: true,
      createdAt: '2026-08-23T16:02:00',
      deliveryStatus: 'failed',
    }],
    loadingMessages: false,
    loadingOlder: false,
    hasOlder: true,
    messagesError: null,
    socketState: 'disconnected',
    hasConnectedRealtime: false,
    openRoom,
    closeRoom,
    loadOlder,
    send,
    retry,
    connectRealtime,
    ...overrides,
  };
  useChatStoreMock.mockImplementation(selector => selector(state as never));
  return render(<ChatDetailScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteId = '7';
  getItemMock.mockReturnValue(new Promise(() => undefined));
  useAuthStoreMock.mockImplementation(selector => selector({ accessToken: 'jwt', user: { id: 3 } } as never));
});

afterEach(cleanup);

it('opens the route room without claiming an initial connection is recovering', async () => {
  await renderState();

  await waitFor(() => expect(openRoom).toHaveBeenCalledWith(7));
  expect(screen.queryByText('실시간 연결을 복구하는 중...')).toBeNull();
  expect(screen.getByText('전송 중 메시지')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '이전 메시지 보기' }));
  expect(loadOlder).toHaveBeenCalled();
});

it('shows recovery only after a prior connection', async () => {
  await renderState({ hasConnectedRealtime: true });
  expect(screen.getByText('실시간 연결을 복구하는 중...')).toBeTruthy();
});

it('retries realtime protocol errors with the current access token', async () => {
  await renderState({ socketState: 'error', hasConnectedRealtime: true });
  await fireEvent.press(screen.getByRole('button', { name: '실시간 연결 다시 시도' }));
  expect(connectRealtime).toHaveBeenCalledWith('jwt');
});

it('shows the linked item card and opens its detail screen', async () => {
  let resolveItem: ((value: typeof item) => void) | undefined;
  getItemMock.mockReturnValue(new Promise(resolve => { resolveItem = resolve; }));
  await renderState({ socketState: 'connected' });
  await act(async () => resolveItem?.(item));

  expect(await screen.findByText('카메라 삼각대')).toBeTruthy();
  expect(screen.getByText('2,000원/일')).toBeTruthy();
  expect(screen.getByText('중앙도서관')).toBeTruthy();
  expect(screen.getByText('대여 가능')).toBeTruthy();
  expect(screen.getByLabelText('물품 사진')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '물품 상세 보기' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/items/[id]', params: { id: '11' } });
});

it('keeps only truthful room metadata when linked item loading fails', async () => {
  let rejectItem: ((reason?: unknown) => void) | undefined;
  getItemMock.mockReturnValue(new Promise((_resolve, reject) => { rejectItem = reject; }));
  await renderState({ socketState: 'connected' });
  await act(async () => rejectItem?.(new Error('offline')));

  expect(screen.getByText('서버 삼각대')).toBeTruthy();
  expect(screen.getByText('물품 세부 정보를 불러오지 못했습니다.')).toBeTruthy();
  expect(screen.queryByText('2,000원/일')).toBeNull();
  expect(screen.queryByText('대여 가능')).toBeNull();
});

it('separates calendar dates, distinguishes message ownership, and uses a send icon', async () => {
  await renderState({
    socketState: 'connected',
    messages: [{
      id: 1,
      roomId: 7,
      senderId: 4,
      senderName: '김상대',
      message: '어제 메시지',
      isRead: true,
      createdAt: '2026-08-23T23:59:00',
      deliveryStatus: 'sent',
    }, {
      id: 2,
      roomId: 7,
      senderId: 3,
      senderName: '나',
      message: '오늘 메시지',
      isRead: true,
      createdAt: '2026-08-24T00:01:00',
      deliveryStatus: 'sent',
    }],
  });

  expect(screen.getAllByTestId('chat-date-separator')).toHaveLength(2);
  expect(screen.getByTestId('chat-message-other')).toBeTruthy();
  expect(screen.getByTestId('chat-message-mine')).toBeTruthy();
  expect(screen.getByTestId('chat-send-icon')).toHaveTextContent('send');
});

it('retries a failed message and sends from the keyboard-safe composer', async () => {
  await renderState();

  await fireEvent.press(screen.getByRole('button', { name: '실패 메시지 재전송' }));
  expect(retry).toHaveBeenCalledWith('client-2');

  await fireEvent.changeText(screen.getByPlaceholderText('메시지 입력...'), ' 새 메시지 ');
  await fireEvent.press(screen.getByRole('button', { name: '메시지 보내기' }));
  await waitFor(() => expect(send).toHaveBeenCalledWith('새 메시지'));
});

it('shows a message loading state', async () => {
  await renderState({ loadingMessages: true, messages: [] });
  expect(screen.getByLabelText('메시지 불러오는 중')).toBeTruthy();
});

it('shows an invalid route without fabricated metadata', async () => {
  mockRouteId = 'invalid';
  await renderState({ rooms: [], activeRoomId: null, messages: [] });
  expect(screen.getAllByText('채팅방을 찾을 수 없습니다.').length).toBeGreaterThan(0);
  expect(openRoom).not.toHaveBeenCalled();
});
