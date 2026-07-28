import {
  ArrowLeft,
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

export default function ProductDetailPage({
  item,
  onClose,
  onChat,
  onReport,
  isOwner = false,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const ItemIcon = item.imageIcon
  const ownerName = item.owner?.split(' ')[0] || '대여자'
  const priceLabel = item.price === 0 ? '무료' : `${item.price.toLocaleString()}원/${item.priceType}`

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
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition"
              aria-label="공유하기"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition"
              aria-label="찜하기"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onReport}
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-rose-500 active:scale-95 transition"
              aria-label="악성 유저 신고하기"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pt-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm ${item.iconColor}`}>
              <ItemIcon className="w-9 h-9" />
            </div>
          </div>

          <div className="absolute right-3 bottom-3 px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-extrabold">
            1 / 3
          </div>
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
                <span className="inline-flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-slate-600 font-bold">{item.rating}</span>
                  <span>({item.reviews}개 후기)</span>
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[15px] font-extrabold text-indigo-600">{priceLabel}</div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">보증금 없음</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {['#카메라', '#미러리스', '#촬영'].map(tag => (
              <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-[10px] text-slate-500 font-bold">
                {tag}
              </span>
            ))}
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
              분실 및 파손 시 수리비 전액 청구됩니다. 대여 전 상태 사진을 반드시 확인하세요.
            </div>
          </section>

          <section className="px-4 py-5 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-3">대여자 정보</h2>
            <button
              type="button"
              className="w-full rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3 flex items-center text-left active:scale-[0.99] transition"
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
                  <span className="text-slate-400">거래 42회</span>
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
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(item)}
              className="h-11 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => onStatusChange?.(item.status === 'available' ? 'RENTED' : 'AVAILABLE')}
              className="h-11 rounded-xl border border-indigo-500 text-xs font-bold text-indigo-600"
            >
              {item.status === 'available' ? '대여 중으로 변경' : '대여 가능으로 변경'}
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
          <button
            type="button"
            onClick={onChat}
            className="w-full h-12 rounded-xl border border-indigo-500 text-indigo-600 font-extrabold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <MessageCircle className="w-4 h-4" />
            채팅하기
          </button>
        )}
      </div>
    </div>
  )
}
