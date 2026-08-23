import type {
  ChatMessage,
  ChatMessagePage,
  ChatReadResult,
  ChatRoom,
} from './types';

function protocolError(field: string): never {
  throw new Error(`Invalid chat response: ${field}`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    protocolError(field);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string): string {
  return typeof value === 'string' ? value : protocolError(field);
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : string(value, field);
}

function integer(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isInteger(value)
    ? value
    : protocolError(field);
}

function nullableInteger(value: unknown, field: string): number | null {
  return value === null ? null : integer(value, field);
}

function boolean(value: unknown, field: string): boolean {
  return typeof value === 'boolean' ? value : protocolError(field);
}

function timestamp(value: unknown, field: string): string {
  const parsed = string(value, field);
  return parsed.trim() && !Number.isNaN(Date.parse(parsed))
    ? parsed
    : protocolError(field);
}

function nullableTimestamp(value: unknown, field: string): string | null {
  return value === null ? null : timestamp(value, field);
}

export function parseChatRoom(value: unknown): ChatRoom {
  const room = record(value, 'room');
  return {
    id: integer(room.chat_room_id, 'chat_room_id'),
    itemId: integer(room.item_id, 'item_id'),
    itemTitle: string(room.item_title, 'item_title'),
    opponentId: integer(room.opponent_id, 'opponent_id'),
    opponentName: string(room.opponent_name, 'opponent_name'),
    lastMessage: nullableString(room.last_message, 'last_message'),
    lastMessageAt: nullableTimestamp(room.last_message_at, 'last_message_at'),
    unreadCount: integer(room.unread_count, 'unread_count'),
  };
}

export function parseChatRoomList(value: unknown): ChatRoom[] {
  if (!Array.isArray(value)) protocolError('rooms');
  return value.map(parseChatRoom);
}

export function parseChatMessage(value: unknown): ChatMessage {
  const message = record(value, 'message');
  return {
    id: integer(message.id, 'id'),
    roomId: integer(message.chat_room_id, 'chat_room_id'),
    senderId: integer(message.sender_id, 'sender_id'),
    senderName: string(message.sender_name, 'sender_name'),
    message: string(message.message, 'message'),
    isRead: boolean(message.is_read, 'is_read'),
    createdAt: timestamp(message.created_at, 'created_at'),
  };
}

export function parseChatMessagePage(value: unknown): ChatMessagePage {
  const page = record(value, 'page');
  if (!Array.isArray(page.messages)) protocolError('messages');
  return {
    messages: page.messages.map(parseChatMessage),
    nextBefore: nullableInteger(page.next_before, 'next_before'),
    hasMore: boolean(page.has_more, 'has_more'),
  };
}

export function parseChatReadResult(value: unknown): ChatReadResult {
  const result = record(value, 'read result');
  return { readCount: integer(result.read_count, 'read_count') };
}
