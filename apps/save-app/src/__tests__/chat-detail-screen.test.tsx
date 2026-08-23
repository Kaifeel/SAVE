import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ChatDetailScreen from '@/app/(authenticated)/chats/[id]';
import { useAuthStore } from '@/auth/store';
import { useChatStore } from '@/chat/store';

const mockBack = jest.fn();
let mockRouteId = '7';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ back: mockBack }),
}));
jest.mock('@/auth/store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/chat/store', () => ({ useChatStore: jest.fn() }));

const useAuthStoreMock = jest.mocked(useAuthStore);
const useChatStoreMock = jest.mocked(useChatStore);
const openRoom = jest.fn().mockResolvedValue(undefined);
const closeRoom = jest.fn();
const loadOlder = jest.fn().mockResolvedValue(undefined);
const send = jest.fn().mockResolvedValue(undefined);
const retry = jest.fn().mockResolvedValue(undefined);

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
    openRoom,
    closeRoom,
    loadOlder,
    send,
    retry,
    ...overrides,
  };
  useChatStoreMock.mockImplementation(selector => selector(state as never));
  return render(<ChatDetailScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteId = '7';
  useAuthStoreMock.mockImplementation(selector => selector({ user: { id: 3 } } as never));
});

afterEach(cleanup);

it('opens the route room and exposes pagination and connection recovery state', async () => {
  await renderState();

  await waitFor(() => expect(openRoom).toHaveBeenCalledWith(7));
  expect(screen.getByText('실시간 연결을 복구하는 중...')).toBeTruthy();
  expect(screen.getByText('전송 중 메시지')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '이전 메시지 보기' }));
  expect(loadOlder).toHaveBeenCalled();
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
