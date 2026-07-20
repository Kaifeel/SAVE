import { ChevronRight, Info, MapPin, Search, Sparkles, X } from 'lucide-react'

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
  } = props

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


              {/* ═══════════════════════════════════════════════════════
                  SECTION 1: 오늘의 AI 추천 물품
                  현재 상태: API 연동 준비 중 (UI Placeholder)
                  연동 예정: 날씨 API (OpenWeatherMap 등) + GPT API
                  담당자 참고: aiRecommend 상태 및 useEffect 주석 참고
              ════════════════════════════════════════════════════════ */}
              <div className="mt-4 mx-5 px-4 py-4 bg-indigo-50 border border-indigo-100 rounded-3xl">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-[17px] font-black text-indigo-950">오늘의 AI 추천 물품</h2>
                </div>

                <p className="text-[15px] font-bold text-indigo-900 mb-3">
                  비 오는 날 우산이 없으신가요?
                </p>

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
                {/* 섹션 헤더 */}
                <div className="hidden">
                  <div className="flex items-center space-x-1.5">
                    <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black tracking-wide px-2 py-0.5 rounded-full uppercase">AI Pick</span>
                    <h2 className="text-[17px] font-black text-slate-800">오늘의 AI 추천 물품</h2>
                  </div>
                  {/* TODO: API 연동 후 '준비 중' 뱃지 제거 */}
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">준비 중</span>
                </div>

                {/* Placeholder 카드 — API 연동 전 */}
                <div className="hidden">

                  {/* 상단 아이콘 + 설명 */}
                  <div className="flex items-start space-x-3.5 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-[14px] leading-snug">
                        AI가 현재 날씨·상황을 분석해
                      </p>
                      <p className="font-bold text-indigo-600 text-[14px] leading-snug">
                        딱 맞는 대여 물품을 추천해 드릴 예정이에요
                      </p>
                      <p className="text-xs text-slate-400 mt-1">날씨 API + GPT 연동 후 자동으로 활성화됩니다</p>
                    </div>
                  </div>

                  {/* 기능 예시 미리보기 */}
                  <div className="space-y-2 mb-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">연동 후 이런 식으로 표시돼요</p>

                    {/* 스켈레톤 카드 #1 */}
                    <div className="bg-white rounded-xl p-3 flex items-center space-x-3 opacity-40">
                      <div className="w-11 h-11 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-200 rounded-full w-3/4 animate-pulse" />
                        <div className="h-3 bg-indigo-100 rounded-full w-1/3 animate-pulse" />
                        <div className="h-2.5 bg-slate-100 rounded-full w-1/2 animate-pulse" />
                      </div>
                      <div className="w-8 h-5 bg-rose-100 rounded animate-pulse flex-shrink-0" />
                    </div>

                    {/* 스켈레톤 카드 #2 */}
                    <div className="bg-white rounded-xl p-3 flex items-center space-x-3 opacity-25">
                      <div className="w-11 h-11 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-200 rounded-full w-2/4 animate-pulse" />
                        <div className="h-3 bg-indigo-100 rounded-full w-1/4 animate-pulse" />
                        <div className="h-2.5 bg-slate-100 rounded-full w-2/5 animate-pulse" />
                      </div>
                      <div className="w-8 h-5 bg-emerald-100 rounded animate-pulse flex-shrink-0" />
                    </div>
                  </div>

                  {/* 연동 예정 기능 설명 */}
                  <div className="border-t border-indigo-100 pt-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">연동 예정 기능</p>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <span>날씨 API — 실시간 날씨·기온 수집</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <span>GPT API — 상황 분석 후 추천 물품 결정</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <span>게시판 매칭 — 추천 조건의 실제 대여글 연결</span>
                    </div>
                  </div>
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
                              <span className="text-[10px] text-slate-400 font-medium">방금 전</span>
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
