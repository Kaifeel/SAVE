import { ChevronRight, Info, MapPin, Search, X } from 'lucide-react'
import { useNow } from '../hooks/useNow'
import { formatRelativeTime } from '../utils/relativeTime'

export default function HomePage(props) {
  const {
    searchQuery,
    setSearchQuery,
    recommendItems,
    setSelectedItem,
    homePopularItems,
    setActiveTab,
    recentItems,
    filteredItems,
    recommendationHeadline,
    recommendationError,
    onRefreshRecommendations,
  } = props
  const now = useNow()

  return (
            <div className="animate-in fade-in duration-200">
              
              {/* SEARCH BAR (Image 2 - 캠퍼스 대여소 검색어 입력창) */}
              <div className="px-5 py-3 bg-white">
                <div className="relative flex items-center bg-slate-100 rounded-2xl px-4 py-3 group focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                  <Search className="w-5 h-5 text-slate-400 mr-2 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="빌리고 싶은 물건을 검색하세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[15px] placeholder-slate-400 text-slate-800"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>


              {/* SECTION 1: 오늘의 AI 추천 물품 */}
              <div className="mt-4 mx-5 px-4 py-4 bg-indigo-50 border border-indigo-100 rounded-3xl">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-[17px] font-black text-indigo-950">오늘의 AI 추천 물품</h2>
                </div>

                <p className="text-[15px] font-bold text-indigo-900 mb-3">
                  {recommendationHeadline || '상황에 맞는 물품을 추천받아 보세요.'}
                </p>
                {recommendationError && <p role="alert" className="mb-2 text-xs text-rose-600">{recommendationError.message}</p>}
                {recommendItems.length === 0 && (
                  <button type="button" onClick={onRefreshRecommendations} className="mb-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
                    AI 추천 받기
                  </button>
                )}

                <div className="space-y-2.5">
                  {recommendItems.slice(0, 2).map((item) => {
                    const ItemIcon = item.imageIcon
                    const badgeClass = item.badge === '인기'
                      ? 'bg-rose-50 text-rose-500'
                      : 'bg-emerald-50 text-emerald-600'

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                          <ItemIcon className="w-6 h-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate leading-tight">{item.title}</h4>
                          <div className="text-sm font-extrabold text-indigo-600 mt-0.5">
                            {item.price.toLocaleString()}원/{item.priceType}
                          </div>
                          <div className="flex items-center text-[11px] text-slate-400 mt-0.5 truncate">
                            <MapPin className="w-3.5 h-3.5 mr-0.5 text-indigo-400 flex-shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md flex-shrink-0 ${badgeClass}`}>
                          {item.badge}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SECTION 2: 인기 대여 물품 (Image 2 - 인기 대여 물품) */}
              {homePopularItems.length > 0 && (
                <div className="mt-4 px-5 py-3">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[17px] font-black text-slate-800">인기 대여 물품</h2>
                    <button onClick={() => setActiveTab('search')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center">
                      <span>더보기</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {homePopularItems.slice(0, 4).map((item) => {
                      const ItemIcon = item.imageIcon
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-3 flex flex-col cursor-pointer hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                        >
                          <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-2.5 relative ${item.iconColor}`}>
                            <ItemIcon className="w-9 h-9" />
                            <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm shadow-sm px-2 py-0.5 text-[9px] font-extrabold text-rose-500 rounded-md">
                              {item.badge}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-slate-800 text-sm truncate leading-tight">{item.title}</h4>
                          <div className="text-sm font-extrabold text-indigo-600 mt-1">
                            {item.price.toLocaleString()}원/{item.priceType}
                          </div>
                          
                          <div className="flex items-center text-[10px] text-slate-400 mt-2 space-x-1.5 truncate">
                            <span className="flex items-center truncate">
                              <MapPin className="w-3 h-3 mr-0.5 text-indigo-400" />
                              {item.location}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: 방금 올라왔어요 (Image 2 - 방금 올라왔어요) */}
              {recentItems.length > 0 && (
                <div className="mt-4 px-5 py-3">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[17px] font-black text-slate-800">방금 올라왔어요</h2>
                    <button onClick={() => setActiveTab('search')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center">
                      <span>더보기</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    {recentItems.map((item) => {
                      const ItemIcon = item.imageIcon
                      const relativeTime = formatRelativeTime(item.createdAt, now)
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-3 flex items-center space-x-3.5 cursor-pointer hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative ${item.iconColor}`}>
                            <ItemIcon className="w-6 h-6" />
                            {item.type === 'want' && (
                              <span className="absolute -top-1 -left-1 bg-amber-500 text-white font-bold text-[8px] px-1 rounded-sm">구해요</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-800 text-sm truncate">{item.title}</h4>
                              {relativeTime && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {relativeTime}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm font-extrabold text-indigo-600">
                                {item.price === 0 ? '무료' : `${item.price.toLocaleString()}원/${item.priceType}`}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-0.5 text-indigo-400" />
                                {item.location}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* EMPTY FILTER VIEW */}
              {filteredItems.length === 0 && (
                <div className="py-16 text-center">
                  <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">검색어에 맞는 물품이 없습니다.</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('')
                    }}
                    className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
                  >
                    필터 초기화하기
                  </button>
                </div>
              )}
            </div>
  )
}
