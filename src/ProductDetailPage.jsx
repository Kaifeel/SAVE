import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  ShieldAlert,
  Star,
  User
} from 'lucide-react'
import { useState } from 'react'
import { useNow } from './hooks/useNow'
import ItemPhoto from './components/ItemPhoto'
import { formatRelativeTime } from './utils/relativeTime'

const COMMON_SAFETY_NOTICE = '분실 및 파손 시 수리비 전액 청구됩니다. 대여 전 상태 사진을 반드시 확인하세요.'

export default function ProductDetailPage({
  item,
  onClose,
  onChat,
  onReport,
  isOwner = false,
  onEdit,
  onDelete,
  onRental,
  onToggleWishlist,
  onOwnerProfile,
  onShare,
}) {
  const [photoSelection, setPhotoSelection] = useState({ key: '', index: 0 })
  const ItemIcon = item.imageIcon
  const ownerName = item.owner?.split(' ')[0] || '대여자'
  const priceLabel = item.price === 0 ? '무료' : `${item.price.toLocaleString()}원/${item.priceType}`
  const imageUrls = [...new Set([item.mainImageUrl, ...(item.photos || [])].filter(
    imageUrl => typeof imageUrl === 'string' && imageUrl.trim(),
  ))]
  const imageSetKey = `${item.id ?? ''}\n${imageUrls.join('\n')}`
  const selectedIndex = photoSelection.key === imageSetKey ? photoSelection.index : 0
  const currentPhotoIndex = Math.min(selectedIndex, Math.max(imageUrls.length - 1, 0))
  const currentPhotoUrl = imageUrls[currentPhotoIndex]
  const hasMultiplePhotos = imageUrls.length > 1
  const now = useNow()
  const relativeTime = formatRelativeTime(item.createdAt, now)

  const showPreviousPhoto = () => {
    setPhotoSelection({
      key: imageSetKey,
      index: (currentPhotoIndex - 1 + imageUrls.length) % imageUrls.length,
    })
  }

  const showNextPhoto = () => {
    setPhotoSelection({
      key: imageSetKey,
      index: (currentPhotoIndex + 1) % imageUrls.length,
    })
  }

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
      <div className="flex-1 overflow-y-auto pb-24 bg-white">
        <section className="relative h-40 bg-slate-100">
          <div className="absolute top-3 left-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onShare?.(item)}
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition"
              aria-label="공유하기"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleWishlist?.(item)}
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition"
              aria-label={item.wishlisted ? '찜 해제' : '찜하기'}
            >
              <Heart className={`w-4 h-4 ${item.wishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onReport?.(item)}
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-rose-500 active:scale-95 transition"
              aria-label="악성 유저 신고하기"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pt-4">
            <ItemPhoto
              item={item}
              src={currentPhotoUrl}
              alt={`${item.title} 사진`}
              className="h-full w-full object-contain"
              fallback={(
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm ${item.iconColor}`}>
                  <ItemIcon className="w-9 h-9" />
                </div>
              )}
            />
          </div>

          {hasMultiplePhotos && (
            <>
              <button
                type="button"
                onClick={showPreviousPhoto}
                aria-label="이전 사진"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={showNextPhoto}
                aria-label="다음 사진"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {imageUrls.length > 0 && (
            <div
              aria-live="polite"
              aria-label={`사진 ${currentPhotoIndex + 1}/${imageUrls.length}`}
              className="absolute left-1/2 bottom-3 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-2.5 py-1.5 text-[10px] font-extrabold text-slate-400 shadow-lg shadow-slate-900/10 backdrop-blur-md"
            >
              {hasMultiplePhotos && (
                <span className="flex items-center gap-1" aria-hidden="true">
                  {imageUrls.map((imageUrl, index) => (
                    <span
                      key={imageUrl}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        index === currentPhotoIndex
                          ? 'w-4 bg-indigo-500'
                          : 'w-1.5 bg-slate-300'
                      }`}
                    />
                  ))}
                </span>
              )}
              <span className="tabular-nums">
                <span className="text-indigo-600">{currentPhotoIndex + 1}</span>
                <span className="mx-1 text-slate-300">/</span>
                <span>{imageUrls.length}</span>
              </span>
            </div>
          )}
        </section>

        <div className="px-4 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[17px] leading-6 font-bold text-slate-800 break-keep">
                {item.title}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-indigo-500" />
                  {item.location}
                </span>
                {relativeTime && <span>{relativeTime}</span>}
                <button
                  type="button"
                  onClick={() => onOwnerProfile?.(item)}
                  aria-label={`작성자 평점 ${item.rating}, 후기 ${item.reviews}개 보기`}
                  className="inline-flex items-center gap-0.5"
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-slate-600 font-bold">{item.rating}</span>
                  <span>({item.reviews}개 후기)</span>
                </button>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[15px] font-extrabold text-indigo-600">{priceLabel}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100">
          <section className="px-4 py-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">물품 설명</h2>
            <p className="text-[12px] leading-5 text-slate-600 break-keep">
              {item.description}
            </p>
          </section>

          <section className="px-4 py-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-slate-800">주의사항</h2>
            </div>
            <div className="rounded-xl bg-orange-50 px-3 py-3 text-[11px] leading-4 text-orange-600 font-bold">
              {item.precautions || COMMON_SAFETY_NOTICE}
            </div>
          </section>

          <section className="px-4 py-5 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-3">대여자 정보</h2>
            <button
              type="button"
              onClick={() => onOwnerProfile?.(item)}
              className="w-full rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3 flex items-center text-left active:scale-[0.99] transition"
              aria-label={`${ownerName} 프로필 보기`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-lg mr-3">
                <User className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800">{ownerName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{item.university}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px]">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-700">{item.rating}</span>
                </div>
              </div>
              <span className="text-[11px] text-indigo-600 font-bold">프로필</span>
              <ChevronRight className="w-4 h-4 text-indigo-500 ml-0.5" />
            </button>
          </section>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 bg-white border-t border-slate-100 px-3 pt-3 pb-4">
        {isOwner ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(item)}
              className="h-11 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(item.id)}
              className="h-11 rounded-xl bg-rose-600 text-xs font-bold text-white"
            >
              삭제
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onChat}
              className="h-12 rounded-xl border border-indigo-500 text-indigo-600 font-extrabold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <MessageCircle className="w-4 h-4" />
              채팅하기
            </button>
            <button type="button" onClick={onRental} className="h-12 rounded-xl bg-indigo-600 text-sm font-extrabold text-white">
              대여 요청
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
