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
  const status = item.status || item.itemStatus || 'available'
  const isWantPost = type === 'want' || type === 'REQUEST' || type === 'BORROW'
  const ItemIcon = isWantPost ? PenTool : Camera

  return {
    id: item.id || item.itemId,
    title: item.title || item.name || item.itemName || '물품명 없음',
    price: Number(item.price || item.rentalPrice || item.rentPrice || 0),
    priceType: item.priceType || item.rentalUnit || item.periodUnit || '일',
    location: item.location || item.preferredLocation || '캠퍼스 내',
    badge: item.badge || item.label || '',
    section: item.section || 'recent',
    type: isWantPost ? 'want' : 'rent',
    university: item.university || item.school || '부경대학교',
    rating: Number(item.rating || item.ownerRating || 0),
    reviews: Number(item.reviews || item.reviewCount || 0),
    owner: item.ownerName || item.owner?.name || item.userName || '대여자',
    description: item.description || item.content || '',
    imageIcon: ItemIcon,
    iconColor: isWantPost ? 'text-blue-500 bg-blue-50' : 'text-rose-500 bg-rose-50',
    status,
    photos: item.photos || item.images || item.imageUrls || [],
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
    id: message.id || message.messageId || Date.now(),
    sender: senderType === 'me' || senderType === 'ME' || message.isMine ? 'me' : 'other',
    text: message.text || message.content || message.message || '',
    time: message.time || message.createdAt || '',
    raw: message,
  }
}

export function normalizeChatRoom(apiRoom) {
  const room = unwrapObject(apiRoom)
  const messages = unwrapList(room.messages).map(normalizeChatMessage)

  return {
    id: room.id || room.roomId,
    roomId: room.id || room.roomId,
    itemId: room.itemId || room.item?.id,
    sender: room.partnerName || room.senderName || room.otherUserName || room.userName || '상대방',
    itemTitle: room.itemTitle || room.item?.title || room.item?.name || '물품',
    lastMessage: room.lastMessage || messages.at(-1)?.text || '',
    time: room.time || room.updatedAt || room.lastMessageAt || '',
    unread: Boolean(room.unread || room.unreadCount > 0),
    unreadCount: Number(room.unreadCount || 0),
    avatar: room.avatar || room.profileImageUrl || DEFAULT_AVATAR,
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
    priceType,
    location,
    type,
    description,
    photos,
  }
}
