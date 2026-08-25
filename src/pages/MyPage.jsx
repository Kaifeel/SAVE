import { ChevronRight, User } from 'lucide-react'
import ItemPhoto from '../components/ItemPhoto'

const STATUS_META = {
  available: ['대여 가능', 'text-emerald-600 bg-emerald-50'],
  request_pending: ['요청 확인 중', 'text-amber-600 bg-amber-50'],
  reserved: ['대여 예약', 'text-indigo-600 bg-indigo-50'],
  rented: ['대여 중', 'text-rose-500 bg-rose-50'],
}

function itemStatusMeta(status) {
  return STATUS_META[status] || [status || '상태 확인', 'text-slate-500 bg-slate-100']
}

export default function MyPage(props) {
  const {
    memberName,
    memberDepartment,
    popularItems,
    setSelectedItem,
    recommendItems,
    onLogout,
    onOpenRentals,
    data,
  } = props

  return (
            <div className="p-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                  <User className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-900 truncate">{memberName || '사용자'}</h2>
                  {memberDepartment && (
                    <p className="text-xs font-bold text-indigo-600 mt-1">{memberDepartment}</p>
                  )}
                </div>
              </div>

              {data?.profile?.error && <p role="alert" className="mb-3 text-xs text-rose-600">프로필을 불러오지 못했습니다.</p>}
              <section className="mb-5">
                <h3 className="text-[17px] font-black text-slate-800 mb-2">등록 물품</h3>
                <div className="space-y-3">
                  {(data?.items?.data || popularItems).slice(0, 2).map(item => {
                    const MyItemIcon = item.imageIcon
                    const [statusText, statusClass] = itemStatusMeta(item.status)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="w-full bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3 text-left hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                      >
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${item.iconColor}`}>
                          <ItemPhoto
                            item={item}
                            alt={`${item.title} 사진`}
                            fallback={<MyItemIcon className="w-7 h-7" />}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-extrabold text-slate-800 truncate">{item.title}</div>
                          <div className="text-xs font-bold text-indigo-600 mt-1 truncate">
                            {item.price.toLocaleString()}원/{item.priceType}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex-shrink-0 ${statusClass}`}>
                          {statusText}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="mb-5">
                <h3 className="text-[17px] font-black text-slate-800 mb-2">찜 목록</h3>
                <div className="space-y-3">
                  {(data?.wishlist?.data || recommendItems).slice(0, 2).map(item => {
                    const FavoriteIcon = item.imageIcon
                    const [statusText, statusClass] = itemStatusMeta(item.status)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="w-full bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3 text-left hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                      >
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${item.iconColor}`}>
                          <ItemPhoto
                            item={item}
                            alt={`${item.title} 사진`}
                            fallback={<FavoriteIcon className="w-7 h-7" />}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-extrabold text-slate-800 truncate">{item.title}</div>
                          <div className="text-xs font-bold text-indigo-600 mt-1 truncate">
                            {item.price.toLocaleString()}원/{item.priceType}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex-shrink-0 ${statusClass}`}>
                          {statusText}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <button type="button" onClick={onOpenRentals} className="w-full text-left px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <span>대여 내역</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button type="button" disabled className="w-full text-left px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <span>알림 설정</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button type="button" onClick={onLogout} className="w-full text-left px-4 py-3 text-sm font-extrabold text-rose-500 hover:bg-rose-50/30 transition-colors">
                  로그아웃
                </button>
              </div>
            </div>
  )
}
