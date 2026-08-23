import {
  parseChatMessage,
  parseChatMessagePage,
  parseChatRoomList,
} from './schema';

export const backendRoom = {
  chat_room_id: 7,
  item_id: 11,
  item_title: '삼각대',
  opponent_id: 4,
  opponent_name: '김상대',
  last_message: '안녕하세요',
  last_message_at: '2026-08-23T16:00:00',
  unread_count: 2,
};

export const backendMessage = {
  id: 21,
  chat_room_id: 7,
  sender_id: 4,
  sender_name: '김상대',
  message: '안녕하세요',
  is_read: false,
  created_at: '2026-08-23T16:00:00',
};

describe('chat schema', () => {
  it('parses snake-case room, message, and cursor page payloads', () => {
    expect(parseChatRoomList([backendRoom])).toEqual([{
      id: 7,
      itemId: 11,
      itemTitle: '삼각대',
      opponentId: 4,
      opponentName: '김상대',
      lastMessage: '안녕하세요',
      lastMessageAt: '2026-08-23T16:00:00',
      unreadCount: 2,
    }]);
    expect(parseChatMessage(backendMessage)).toEqual({
      id: 21,
      roomId: 7,
      senderId: 4,
      senderName: '김상대',
      message: '안녕하세요',
      isRead: false,
      createdAt: '2026-08-23T16:00:00',
    });
    expect(parseChatMessagePage({
      messages: [backendMessage],
      next_before: 21,
      has_more: true,
    })).toEqual({
      messages: [expect.objectContaining({ id: 21 })],
      nextBefore: 21,
      hasMore: true,
    });
  });

  it('accepts null last-message fields for a new room', () => {
    expect(parseChatRoomList([{
      ...backendRoom,
      last_message: null,
      last_message_at: null,
    }])[0]).toEqual(expect.objectContaining({
      lastMessage: null,
      lastMessageAt: null,
    }));
  });

  it.each([
    ['room id', [{ ...backendRoom, chat_room_id: '7' }]],
    ['room timestamp', [{ ...backendRoom, last_message_at: 'not-a-date' }]],
    ['room array', { ...backendRoom }],
  ])('rejects malformed %s data', (_field, payload) => {
    expect(() => parseChatRoomList(payload)).toThrow('chat');
  });

  it.each([
    ['message id', { ...backendMessage, id: 1.5 }],
    ['message timestamp', { ...backendMessage, created_at: '' }],
    ['message array', { messages: 'invalid', next_before: null, has_more: false }],
    ['page cursor', { messages: [], next_before: '21', has_more: true }],
  ])('rejects malformed %s data', (_field, payload) => {
    const parse = _field.startsWith('message ') && _field !== 'message array'
      ? parseChatMessage
      : parseChatMessagePage;
    expect(() => parse(payload)).toThrow('chat');
  });
});
