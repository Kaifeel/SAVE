import { unwrapList, unwrapObject } from './shared.js'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'

export function normalizeChatMessage(apiMessage, currentUserId) {
  const message = unwrapObject(apiMessage)
  const senderType = message.senderType || message.sender || ''
  const senderId = message.sender_id ?? message.senderId

  return {
    id: message.id || message.message_id || message.messageId || Date.now(),
    sender: senderId === currentUserId
      || senderType === 'me'
      || senderType === 'ME'
      || message.is_mine
      || message.isMine
      ? 'me'
      : 'other',
    text: message.message || message.text || message.content || '',
    time: message.time || message.created_at || message.createdAt || '',
    deliveryStatus: message.deliveryStatus || 'sent',
    raw: message,
  }
}

export function normalizeChatRoom(apiRoom) {
  const room = apiRoom?.data || apiRoom?.chatRoom || apiRoom
  const messages = unwrapList(room.messages).map(normalizeChatMessage)

  return {
    id: room.chat_room_id || room.id || room.roomId,
    roomId: room.chat_room_id || room.id || room.roomId,
    itemId: room.item_id || room.itemId || room.item?.id,
    sender: room.opponent_name || room.partnerName || room.senderName || room.otherUserName || room.userName || '상대방',
    itemTitle: room.item_title || room.itemTitle || room.item?.title || room.item?.name || '물품',
    lastMessage: room.last_message || room.lastMessage || messages.at(-1)?.text || '',
    time: room.time || room.updated_at || room.updatedAt || room.last_message_at || room.lastMessageAt || '',
    unread: Boolean(room.unread || (room.unread_count ?? room.unreadCount) > 0),
    unreadCount: Number(room.unread_count ?? room.unreadCount ?? 0),
    avatar: room.avatar || room.profile_image_url || room.profileImageUrl || DEFAULT_AVATAR,
    messages,
    raw: room,
  }
}

export function normalizeChatRoomsResponse(response) {
  return unwrapList(response).map(normalizeChatRoom)
}

function chatRoomTimestamp(room) {
  const timestamp = new Date(room?.time || '').getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function mergeChatRoomSnapshot(currentRooms, response) {
  const snapshot = normalizeChatRoomsResponse(response)
  const currentById = new Map(currentRooms.map(room => [String(room.id), room]))
  const snapshotIds = new Set(snapshot.map(room => String(room.id)))

  const merged = snapshot.map(room => {
    const current = currentById.get(String(room.id))
    if (!current) return room

    const currentTime = chatRoomTimestamp(current)
    const snapshotTime = chatRoomTimestamp(room)
    const currentIsNewer = currentTime != null
      && (snapshotTime == null || currentTime >= snapshotTime)

    return currentIsNewer
      ? { ...room, ...current, messages: current.messages || room.messages }
      : { ...current, ...room, messages: current.messages || room.messages }
  })

  const realtimeOnly = currentRooms.filter(room => !snapshotIds.has(String(room.id)))
  return [...merged, ...realtimeOnly].sort((left, right) => {
    const leftTime = chatRoomTimestamp(left)
    const rightTime = chatRoomTimestamp(right)
    if (leftTime == null || rightTime == null) return 0
    return rightTime - leftTime
  })
}

export function mergeChatListUpdate(currentRooms, response, activeRoomId = null) {
  const incoming = normalizeChatRoom(response)
  if (incoming.id == null) return currentRooms

  const existing = currentRooms.find(room => String(room.id) === String(incoming.id))
  const isActive = activeRoomId != null && String(activeRoomId) === String(incoming.id)
  const unreadCount = isActive ? 0 : incoming.unreadCount
  const updated = {
    ...existing,
    ...incoming,
    messages: existing?.messages || [],
    unreadCount,
    unread: unreadCount > 0,
  }

  return [
    updated,
    ...currentRooms.filter(room => String(room.id) !== String(incoming.id)),
  ]
}

export function normalizeMessagesResponse(response, currentUserId) {
  const page = Array.isArray(response) ? { messages: response } : (response || {})
  return {
    messages: unwrapList(page.messages)
      .map(message => normalizeChatMessage(message, currentUserId)),
    nextBefore: page.next_before ?? page.nextBefore ?? null,
    hasMore: Boolean(page.has_more ?? page.hasMore),
  }
}
