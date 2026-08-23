import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import ChatScreen from '@/app/(authenticated)/(tabs)/chat';
import { useChatStore } from '@/chat/store';
import type { ChatRoom } from '@/chat/types';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/chat/store', () => ({ useChatStore: jest.fn() }));

const useChatStoreMock = jest.mocked(useChatStore);
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
  loadRooms.mockResolvedValue(undefined);
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
