import { Camera, PenTool } from 'lucide-react'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'

function unwrapList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.content)) return response.content
  if (Array.isArray(response?.results)) return response.results
  return []
}

function unwrapObject(response) {
  return response?.data || response?.item || response
}

export function normalizeItem(apiItem) {
  const item = unwrapObject(apiItem)
  const type = item.type || item.postType || item.tradeType || 'rent'
  const status = (item.status || item.itemStatus || 'AVAILABLE').toLowerCase()
  const isWantPost = type === 'want' || type === 'REQUEST' || type === 'BORROW'
  const ItemIcon = isWantPost ? PenTool : Camera
  const rawPriceUnit = item.rental_unit || item.price_unit || item.priceType || item.rentalUnit || item.periodUnit || 'DAY'
  const priceType = rawPriceUnit === 'DAY' ? '일' : rawPriceUnit === 'HOUR' ? '시간' : rawPriceUnit

  return {
    id: item.id || item.itemId,
    ownerId: item.owner_id ?? item.ownerId ?? item.owner?.id,
    title: item.title || item.name || item.itemName || '물품명 없음',
    price: Number(item.rental_fee ?? item.price ?? item.rentalPrice ?? item.rentPrice ?? 0),
    priceType,
    pickupLocationId: item.pickup_location_id ?? item.pickupLocationId,
    location: item.pickup_location_name || item.pickup_location || item.location || item.preferredLocation || '캠퍼스 내',
    badge: item.badge || item.label || '',
    section: item.section || 'recent',
    type: isWantPost ? 'want' : 'rent',
    universityId: item.owner_university_id ?? item.ownerUniversityId ?? item.university_id ?? item.universityId,
    university: item.owner_university_name || item.university || item.school || '부경대학교',
    rating: Number(item.rating || item.ownerRating || 0),
    reviews: Number(item.reviews || item.reviewCount || 0),
    owner: item.owner_name || item.ownerName || item.owner?.name || item.userName || '대여자',
    description: item.description || item.content || '',
    imageIcon: ItemIcon,
    iconColor: isWantPost ? 'text-blue-500 bg-blue-50' : 'text-rose-500 bg-rose-50',
    status,
    photos: item.image_urls || item.photos || item.images || item.imageUrls || [],
    mainImageUrl: item.main_image_url || item.mainImageUrl || null,
    wishlistCount: Number(item.wishlist_count ?? item.wishlistCount ?? 0),
    wishlisted: Boolean(item.wishlisted),
    raw: item,
  }
}

export function normalizeItemsResponse(response) {
  return unwrapList(response).map(normalizeItem)
}

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
  // A chat-room creation response contains an `item` summary as one of its
  // fields. Do not pass it through unwrapObject(), which would mistake that
  // summary for an API response wrapper and discard the room metadata.
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
  return unwrapList(response).map(message => normalizeChatMessage(message, currentUserId))
}

export function toCreateItemPayload({
  title,
  price,
  priceType,
  pickupLocationId,
  type,
  description,
  precautions = '',
  photos = [],
}) {
  return {
    title,
    rental_fee: Number(price || 0),
    rental_unit: priceType === '일' ? 'DAY' : priceType,
    pickup_location_id: Number(pickupLocationId),
    type: type === 'want' ? 'BORROW' : 'LEND',
    description,
    precautions,
    photos,
  }
}
