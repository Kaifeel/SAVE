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
} from './types';

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
