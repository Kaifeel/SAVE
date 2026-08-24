import { ArrowLeft, Flag, MapPin, PackageOpen, Star, User } from 'lucide-react'
import { useUserProfile } from '../hooks/useUserProfile'
import { useNow } from '../hooks/useNow'
import { formatRelativeTime } from '../utils/relativeTime'

function fallbackProfile(item) {
  if (!item) return null
  return {
    id: item.ownerId,
    name: item.owner || '사용자',
    department: '',
    universityName: item.university || '',
    profileImageUrl: null,
    rating: Number(item.rating || 0),
    reviewCount: Number(item.reviews || 0),
    completedTradeCount: 0,
  }
}

function priceLabel(item) {
  return item.price === 0 ? '무료' : `${item.price.toLocaleString()}원/${item.priceType}`
}

export default function UserProfilePage({
  userId,
  accessToken,
  enabled = true,
  refreshKey = 0,
  fallbackItem,
  fallbackItems = [],
  onBack,
  onSelectItem,
  onReport,
  canReport = true,
  api,
}) {
  const remoteEnabled = enabled && Boolean(userId)
  const remote = useUserProfile({
    userId,
    accessToken,
    enabled: remoteEnabled,
    refreshKey,
    api,
  })
  const cachedProfile = fallbackProfile(fallbackItem)
  const useFallback = !remoteEnabled || (Boolean(remote.error) && Boolean(cachedProfile))
  const profile = useFallback ? cachedProfile : remote.profile
  const items = useFallback ? fallbackItems : remote.items
  const reviews = useFallback ? [] : remote.reviews
  const now = useNow()

  return (
    <div className="absolute inset-0 z-[60] bg-slate-50 flex flex-col">
      <header className="h-14 flex-shrink-0 bg-white border-b border-slate-100 px-3 flex items-center justify-between">
        <button type="button" onClick={onBack} aria-label="물품 상세로 돌아가기"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-extrabold text-slate-800">작성자 프로필</h1>
        <div className="w-9" aria-hidden="true" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {remote.loading && (
          <div className="h-full flex items-center justify-center text-sm font-bold text-slate-400">
            프로필을 불러오는 중입니다.
          </div>
        )}
        {!remote.loading && remote.error && !profile && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <User className="w-12 h-12 text-slate-300 mb-3" />
            <p role="alert" className="text-sm font-bold text-slate-600">프로필을 불러오지 못했습니다.</p>
            <button type="button" onClick={remote.reload}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white">
              다시 시도
            </button>
          </div>
        )}
        {!remote.loading && profile && (
          <>
            <section className="bg-white px-5 py-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
                  {profile.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt={`${profile.name} 프로필 사진`}
                      className="w-full h-full object-cover" />
                  ) : <User className="w-9 h-9 text-indigo-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-slate-900 truncate">{profile.name}</h2>
                  {profile.department && <p className="mt-1 text-xs font-bold text-indigo-600">{profile.department}</p>}
                  {profile.universityName && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3" />{profile.universityName}
                    </p>
                  )}
                </div>
                {canReport && onReport && (
                  <button type="button" onClick={onReport} aria-label={`${profile.name} 신고하기`}
                    className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl bg-slate-50 py-3">
                <div className="text-center"><div className="text-sm font-black"><Star className="inline w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />{profile.rating.toFixed(1)}</div><div className="text-[10px] text-slate-400">평점</div></div>
                <div className="text-center"><div className="text-sm font-black">{profile.reviewCount}</div><div className="text-[10px] text-slate-400">후기</div></div>
                <div className="text-center"><div className="text-sm font-black">{profile.completedTradeCount}</div><div className="text-[10px] text-slate-400">완료 거래</div></div>
              </div>
            </section>
            <section className="border-b border-slate-100 px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-black text-slate-800">받은 후기</h2>
                <span className="text-xs font-bold text-slate-400">{reviews.length}개</span>
              </div>
              {reviews.length === 0 ? (
                <div className="rounded-2xl bg-white py-8 text-center text-xs text-slate-400">
                  아직 공개된 후기가 없습니다.
                </div>
              ) : reviews.map(review => (
                <article key={review.id} className="mb-3 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex" aria-label={`${review.rating}점`}>
                      {[1, 2, 3, 4, 5].map(value => (
                        <Star key={value} className={`h-3.5 w-3.5 ${value <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(review.createdAt, now)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-slate-700">{review.content}</p>
                  <p className="mt-3 text-xs font-bold text-slate-600">
                    {review.reviewerName} · {review.itemTitle}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-indigo-500">
                    {review.revieweeRole === 'LENDER'
                      ? '물품을 빌려주고 받은 후기'
                      : '물품을 빌리고 받은 후기'}
                  </p>
                </article>
              ))}
            </section>
            <section className="px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-black text-slate-800">등록 물품</h2>
                <span className="text-xs font-bold text-slate-400">{items.length}개</span>
              </div>
              {items.length === 0 ? (
                <div className="rounded-2xl bg-white py-12 text-center"><PackageOpen className="w-10 h-10 text-slate-300 mx-auto" /><p className="text-xs text-slate-400">등록된 물품이 없습니다.</p></div>
              ) : items.map(item => {
                const ItemIcon = item.imageIcon || PackageOpen
                const available = item.status === 'available'
                return (
                  <button key={item.id} type="button" onClick={() => onSelectItem?.(item)}
                    className="mb-3 w-full rounded-2xl border border-slate-100 bg-white p-3 flex items-center gap-3 text-left">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${item.iconColor || 'bg-slate-100'}`}><ItemIcon className="w-7 h-7" /></div>
                    <div className="min-w-0 flex-1"><div className="text-sm font-extrabold truncate">{item.title}</div><div className="mt-1 text-xs font-bold text-indigo-600">{priceLabel(item)}</div></div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold ${available ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{available ? '대여 가능' : '대여중'}</span>
                  </button>
                )
              })}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
