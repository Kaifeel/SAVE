import { useAuthStore } from '@/auth/store';
import * as api from './api';
import { createChatSocket } from './socket';
import { initialChatState, useChatStore } from './store';
import type { ChatMessage, ChatRoom } from './types';

jest.mock('./api', () => ({
  listChatRooms: jest.fn(),
  loadChatMessages: jest.fn(),
  sendChatMessage: jest.fn(),
  markChatRoomRead: jest.fn(),
}));
jest.mock('./socket', () => ({ createChatSocket: jest.fn() }));

const listChatRooms = jest.mocked(api.listChatRooms);
const loadChatMessages = jest.mocked(api.loadChatMessages);
const sendChatMessage = jest.mocked(api.sendChatMessage);
const markChatRoomRead = jest.mocked(api.markChatRoomRead);
const createChatSocketMock = jest.mocked(createChatSocket);

const room: ChatRoom = {
  id: 7,
  itemId: 11,
  itemTitle: '삼각대',
  opponentId: 4,
  opponentName: '김상대',
  lastMessage: '안녕하세요',
  lastMessageAt: '2026-08-23T16:00:00',
  unreadCount: 2,
};

const message = (id: number, text = `message-${id}`): ChatMessage => ({
  id,
  roomId: 7,
  senderId: 4,
  senderName: '김상대',
  message: text,
  isRead: false,
  createdAt: `2026-08-23T16:0${id}:00`,
});

let roomHandler: ((value: ChatMessage) => void) | undefined;
let chatListHandler: ((value: ChatRoom) => void) | undefined;
let socketStateHandler: ((state: 'connecting' | 'connected' | 'disconnected' | 'error') => void)
  | undefined;
const disconnectSocket = jest.fn().mockResolvedValue(undefined);

beforeEach(async () => {
  await useChatStore.getState().disconnectRealtime();
  jest.clearAllMocks();
  roomHandler = undefined;
  chatListHandler = undefined;
  socketStateHandler = undefined;
  useChatStore.setState(initialChatState);
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'jwt',
    user: {
      id: 3,
      email: 'me@pukyong.ac.kr',
      name: '나',
      department: null,
      universityId: 1,
      universityName: '부경대학교',
      profileImageUrl: null,
      role: 'USER',
    },
  });
  markChatRoomRead.mockResolvedValue({ readCount: 1 });
  createChatSocketMock.mockImplementation(options => {
    socketStateHandler = options.onStateChange;
    return {
      connect: jest.fn(),
      disconnect: disconnectSocket,
      subscribeRoom: jest.fn((_roomId, handler) => {
        roomHandler = handler;
        return jest.fn();
      }),
      subscribeChatList: jest.fn(handler => {
        chatListHandler = handler;
        return jest.fn();
      }),
      subscribeNotifications: jest.fn(() => jest.fn()),
    };
  });
});

it('loads a validated room snapshot', async () => {
  listChatRooms.mockResolvedValue([room]);

  await useChatStore.getState().loadRooms();

  expect(useChatStore.getState()).toMatchObject({
    rooms: [room],
    loadingRooms: false,
    roomsError: null,
  });
});

it('ignores a stale room response after a newer room is opened', async () => {
  let resolveFirst: ((value: Awaited<ReturnType<typeof loadChatMessages>>) => void) | undefined;
  let resolveSecond: ((value: Awaited<ReturnType<typeof loadChatMessages>>) => void) | undefined;
  loadChatMessages
    .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
    .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));

  const first = useChatStore.getState().openRoom(7);
  const second = useChatStore.getState().openRoom(8);
  resolveFirst?.({ messages: [message(1)], nextBefore: null, hasMore: false });
  await Promise.resolve();
  expect(useChatStore.getState().activeRoomId).toBe(8);

  resolveSecond?.({
    messages: [{ ...message(2), roomId: 8 }],
    nextBefore: null,
    hasMore: false,
  });
  await Promise.all([first, second]);

  expect(useChatStore.getState().messages.map(entry => entry.id)).toEqual([2]);
});

it('prepends older messages without duplicating an existing id', async () => {
  loadChatMessages
    .mockResolvedValueOnce({ messages: [message(3), message(4)], nextBefore: 3, hasMore: true })
    .mockResolvedValueOnce({ messages: [message(1), message(3)], nextBefore: null, hasMore: false });

  await useChatStore.getState().openRoom(7);
  await useChatStore.getState().loadOlder();

  expect(loadChatMessages).toHaveBeenLastCalledWith(7, 3);
  expect(useChatStore.getState().messages.map(entry => entry.id)).toEqual([1, 3, 4]);
  expect(useChatStore.getState().hasOlder).toBe(false);
});

it('reconciles one optimistic message with REST and STOMP copies', async () => {
  let resolveSend: ((value: ChatMessage) => void) | undefined;
  loadChatMessages.mockResolvedValue({ messages: [], nextBefore: null, hasMore: false });
  sendChatMessage.mockReturnValue(new Promise(resolve => { resolveSend = resolve; }));
  listChatRooms.mockResolvedValue([room]);
  useChatStore.getState().connectRealtime('jwt');
  socketStateHandler?.('connected');
  await useChatStore.getState().openRoom(7);

  const sending = useChatStore.getState().send('새 메시지');
  const saved = { ...message(9, '새 메시지'), senderId: 3, senderName: '나' };
  roomHandler?.(saved);
  resolveSend?.(saved);
  await sending;

  expect(useChatStore.getState().messages.filter(entry => entry.id === 9)).toHaveLength(1);
  expect(useChatStore.getState().messages).toHaveLength(1);
});

it('keeps a realtime message when the room snapshot arrives later', async () => {
  let resolveSnapshot: ((value: Awaited<ReturnType<typeof loadChatMessages>>) => void) | undefined;
  loadChatMessages.mockReturnValue(new Promise(resolve => { resolveSnapshot = resolve; }));
  useChatStore.getState().connectRealtime('jwt');

  const opening = useChatStore.getState().openRoom(7);
  roomHandler?.(message(6, '실시간 메시지'));
  resolveSnapshot?.({ messages: [message(5, '이전 메시지')], nextBefore: null, hasMore: false });
  await opening;

  expect(useChatStore.getState().messages.map(entry => entry.id)).toEqual([5, 6]);
});

it('keeps a failed optimistic message and retries it', async () => {
  sendChatMessage
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ...message(10, '재시도'), senderId: 3, senderName: '나' });
  loadChatMessages.mockResolvedValue({ messages: [], nextBefore: null, hasMore: false });

  await useChatStore.getState().openRoom(7);
  await useChatStore.getState().send('재시도');

  const failed = useChatStore.getState().messages[0];
  expect(failed.deliveryStatus).toBe('failed');
  await useChatStore.getState().retry(failed.clientId!);

  expect(sendChatMessage).toHaveBeenCalledTimes(2);
  expect(useChatStore.getState().messages[0]).toMatchObject({ id: 10, deliveryStatus: 'sent' });
});

it('keeps the active room unread count at zero and reloads snapshots on reconnect', async () => {
  listChatRooms.mockResolvedValue([room]);
  loadChatMessages.mockResolvedValue({ messages: [], nextBefore: null, hasMore: false });
  useChatStore.setState({ rooms: [room] });
  useChatStore.getState().connectRealtime('jwt');
  await useChatStore.getState().openRoom(7);

  chatListHandler?.({ ...room, unreadCount: 5 });
  socketStateHandler?.('connected');
  await Promise.resolve();

  socketStateHandler?.('disconnected');
  socketStateHandler?.('connected');
  await Promise.resolve();
  await Promise.resolve();

  expect(useChatStore.getState().rooms[0].unreadCount).toBe(0);
  expect(listChatRooms).toHaveBeenCalled();
  expect(loadChatMessages).toHaveBeenCalledTimes(2);
  expect(useChatStore.getState().socketState).toBe('connected');
});
