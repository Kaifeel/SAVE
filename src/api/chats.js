import { apiFetch } from './client'

export function createOrGetChatRoom(itemId, accessToken) {
  return apiFetch('/chats/rooms', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ item_id: itemId }),
  })
}

export function getChatRooms(accessToken) {
  return apiFetch('/chats/rooms', {
    method: 'GET',
    accessToken,
  })
}

export function getChatMessages(roomId, accessToken) {
  return apiFetch(`/chats/rooms/${roomId}/messages`, {
    method: 'GET',
    accessToken,
  })
}

export function sendChatMessage(roomId, content, accessToken) {
  return apiFetch(`/chats/rooms/${roomId}/messages`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ message: content }),
  })
}
