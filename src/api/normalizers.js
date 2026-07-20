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
  const rawPriceUnit = item.price_unit || item.priceType || item.rentalUnit || item.periodUnit || 'DAY'
  const priceType = rawPriceUnit === 'DAY' ? '일' : rawPriceUnit === 'HOUR' ? '시간' : rawPriceUnit

  return {
    id: item.id || item.itemId,
    title: item.title || item.name || item.itemName || '물품명 없음',
    price: Number(item.price || item.rentalPrice || item.rentPrice || 0),
    priceType,
    location: item.pickup_location || item.location || item.preferredLocation || '캠퍼스 내',
    badge: item.badge || item.label || '',
    section: item.section || 'recent',
    type: isWantPost ? 'want' : 'rent',
    university: item.university || item.school || '부경대학교',
    rating: Number(item.rating || item.ownerRating || 0),
    reviews: Number(item.reviews || item.reviewCount || 0),
    owner: item.owner_name || item.ownerName || item.owner?.name || item.userName || '대여자',
    description: item.description || item.content || '',
    imageIcon: ItemIcon,
    iconColor: isWantPost ? 'text-blue-500 bg-blue-50' : 'text-rose-500 bg-rose-50',
    status,
    photos: item.image_urls || item.photos || item.images || item.imageUrls || [],
    raw: item,
  }
}

export function normalizeItemsResponse(response) {
  return unwrapList(response).map(normalizeItem)
}

export function normalizeChatMessage(apiMessage) {
  const message = unwrapObject(apiMessage)
  const senderType = message.senderType || message.sender || ''

  return {
    id: message.id || message.message_id || message.messageId || Date.now(),
    sender: senderType === 'me' || senderType === 'ME' || message.is_mine || message.isMine ? 'me' : 'other',
    text: message.message || message.text || message.content || '',
    time: message.time || message.created_at || message.createdAt || '',
    raw: message,
  }
}

export function normalizeChatRoom(apiRoom) {
  const room = unwrapObject(apiRoom)
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

export function normalizeMessagesResponse(response) {
  return unwrapList(response).map(normalizeChatMessage)
}

export function toCreateItemPayload({ title, price, priceType, location, type, description, photos }) {
  return {
    title,
    price: Number(price || 0),
    price_unit: priceType === '일' ? 'DAY' : priceType,
    pickup_location: location,
    type: type === 'want' ? 'BORROW' : 'LEND',
    description,
    photos,
  }
}
