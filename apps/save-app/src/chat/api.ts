import { apiRequest } from '@/api/client';
import {
  parseChatMessage,
  parseChatMessagePage,
  parseChatReadResult,
  parseChatRoomList,
} from './schema';
import type {
  ChatMessage,
  ChatMessagePage,
  ChatReadResult,
  ChatRoom,
  ChatRoomCreation,
} from './types';

function parseChatRoomCreation(value: unknown): ChatRoomCreation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid chat room creation response');
  }
  const response = value as Record<string, unknown>;
  const item = response.item;
  const id = response.chat_room_id;
  const itemId = typeof item === 'object' && item !== null && !Array.isArray(item)
    ? (item as Record<string, unknown>).id
    : null;
  if (!Number.isInteger(id) || (id as number) <= 0
      || !Number.isInteger(itemId) || (itemId as number) <= 0) {
    throw new Error('Invalid chat room creation response');
  }
  return { id: id as number, itemId: itemId as number };
}

export async function createOrGetChatRoom(itemId: number): Promise<ChatRoomCreation> {
  if (!Number.isInteger(itemId) || itemId <= 0) throw new Error('Invalid item id');
  const response = await apiRequest<unknown>('/chats/rooms', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });
  return parseChatRoomCreation(response);
}

export async function listChatRooms(): Promise<ChatRoom[]> {
  return parseChatRoomList(await apiRequest<unknown>('/chats/rooms'));
}

export async function loadChatMessages(
  roomId: number,
  before: number | null = null,
): Promise<ChatMessagePage> {
  const params = before === null ? { size: 50 } : { size: 50, before };
  const response = await apiRequest<unknown>(`/chats/rooms/${roomId}/messages`, { params });
  return parseChatMessagePage(response);
}

export async function sendChatMessage(roomId: number, message: string): Promise<ChatMessage> {
  const response = await apiRequest<unknown>(`/chats/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return parseChatMessage(response);
}

export async function markChatRoomRead(roomId: number): Promise<ChatReadResult> {
  const response = await apiRequest<unknown>(`/chats/rooms/${roomId}/read`, {
    method: 'PATCH',
  });
  return parseChatReadResult(response);
}
