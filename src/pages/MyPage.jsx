import { ChevronRight, User } from 'lucide-react'

export default function MyPage(props) {
  const {
    memberName,
    memberDepartment,
    popularItems,
    setSelectedItem,
    recommendItems,
    onLogout,
    onOpenRentals,
  } = props

  return (
            <div className="p-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                  <User className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-900 truncate">{memberName || '김부경'}</h2>
                  <p className="text-xs font-bold text-indigo-600 mt-1">{memberDepartment || '컴퓨터공학과'}</p>
                </div>
              </div>

              <section className="mb-5">
                <h3 className="text-[17px] font-black text-slate-800 mb-2">등록 물품</h3>
                <div className="space-y-3">
                  {popularItems.slice(0, 2).map((item, index) => {
                    const MyItemIcon = item.imageIcon
                    const statusText = index === 1 ? '대여중' : '대여 가능'
                    const statusClass = index === 1
                      ? 'text-rose-500 bg-rose-50'
                      : index === 2
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-slate-500 bg-slate-100'

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="w-full bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3 text-left hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                      >
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                          <MyItemIcon className="w-7 h-7" />
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
                  {recommendItems.slice(0, 2).map((item, index) => {
                    const FavoriteIcon = item.imageIcon
                    const statusText = index === 0 ? '대여 가능' : '대여중'
                    const statusClass = index === 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="w-full bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3 text-left hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                      >
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                          <FavoriteIcon className="w-7 h-7" />
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
                <button className="w-full text-left px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center">
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
