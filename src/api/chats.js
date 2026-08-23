import { apiFetch } from './client'

export function createOrGetChatRoom(itemId, accessToken, { enabled = true } = {}) {
  if (!enabled) {
    return Promise.resolve({ chat_room_id: null, item_id: itemId })
  }
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

export function getChatMessages(roomId, accessToken, params = { size: 50 }) {
  return apiFetch(`/chats/rooms/${roomId}/messages`, {
    method: 'GET',
    accessToken,
    params,
  })
}

export function markChatRoomRead(roomId, accessToken) {
  return apiFetch(`/chats/rooms/${roomId}/read`, {
    method: 'PATCH',
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
