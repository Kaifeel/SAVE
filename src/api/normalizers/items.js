import { Camera, PenTool } from 'lucide-react'
import { unwrapList, unwrapObject } from './shared.js'

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
    location: item.pickup_location_name || item.pickup_location || item.location || item.preferredLocation || '위치 정보 없음',
    badge: item.badge || item.label || '',
    section: item.section || 'recent',
    type: isWantPost ? 'want' : 'rent',
    universityId: item.owner_university_id ?? item.ownerUniversityId ?? item.university_id ?? item.universityId,
    university: item.owner_university_name || item.university || item.school || '',
    rating: Number(item.rating ?? item.owner_rating ?? item.ownerRating ?? 0),
    reviews: Number(item.reviews ?? item.review_count ?? item.reviewCount ?? 0),
    owner: item.owner_name || item.ownerName || item.owner?.name || item.userName || '대여자',
    description: item.description || item.content || '',
    precautions: item.precautions || '',
    imageIcon: ItemIcon,
    iconColor: isWantPost ? 'text-blue-500 bg-blue-50' : 'text-rose-500 bg-rose-50',
    status,
    photos: item.image_urls || item.photos || item.images || item.imageUrls || [],
    mainImageUrl: item.main_image_url || item.mainImageUrl || null,
    viewCount: Number(item.view_count ?? item.viewCount ?? 0),
    wishlistCount: Number(item.wishlist_count ?? item.wishlistCount ?? 0),
    wishlisted: Boolean(item.wishlisted),
    createdAt: item.created_at ?? item.createdAt,
    raw: item,
  }
}

export function normalizeItemsResponse(response) {
  return unwrapList(response).map(normalizeItem)
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
