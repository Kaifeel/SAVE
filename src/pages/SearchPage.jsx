import { MapPin, Search } from 'lucide-react'
import AsyncState from '../components/AsyncState'
import ItemPhoto from '../components/ItemPhoto'

export default function SearchPage(props) {
  const {
    activeBoard,
    setActiveBoard,
    searchQuery,
    setSearchQuery,
    availableOnly,
    setAvailableOnly,
    filteredItems,
    setSelectedItem,
    loading,
    error,
    onRetry,
  } = props

  return (
            <div className="p-5 animate-in fade-in duration-200">
              <h2 className="text-xl font-black text-slate-800 mb-4">물품 탐색</h2>

              {/* Board Tabs */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl mb-3">
                <button
                  type="button"
                  onClick={() => setActiveBoard('lend')}
                  className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeBoard === 'lend'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  물품 빌려주기
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBoard('borrow')}
                  className={`py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeBoard === 'borrow'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  물품 빌리기
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="relative flex items-center bg-slate-100 rounded-2xl px-4 py-3 mb-3">
                <Search className="w-5 h-5 text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="장소, 물품명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-[15px] placeholder-slate-400 text-slate-800"
                />
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3 mb-4">
                <span className="text-xs font-extrabold text-slate-700">
                  {activeBoard === 'borrow' ? '대여 희망 물품만 보기' : '대여 가능 물품만 보기'}
                </span>
                <button
                  type="button"
                  aria-pressed={availableOnly}
                  onClick={() => setAvailableOnly(prev => !prev)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    availableOnly ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      availableOnly ? 'translate-x-5 left-1' : 'translate-x-0 left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Combined Grid List */}
              <AsyncState
                loading={loading}
                error={error}
                empty={!loading && !error && filteredItems.length === 0}
                onRetry={onRetry}
                emptyMessage="등록된 물품이 없습니다."
              >
              <div className="space-y-3 mt-2">
                {filteredItems.map((item) => {
                  const ItemIcon = item.imageIcon
                  const statusClass = item.badge === '인기'
                      ? 'bg-rose-50 text-rose-500'
                      : 'bg-emerald-50 text-emerald-600'
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ${item.iconColor}`}>
                        <ItemPhoto
                          item={item}
                          alt={`${item.title} 사진`}
                          fallback={<ItemIcon className="w-7 h-7" />}
                        />
                        {item.status === 'rented' && (
                          <span className="absolute -top-1.5 -right-1.5 bg-slate-700 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm">
                            대여중
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 text-[15px] truncate">{item.title}</h4>
                          {item.status !== 'rented' && (
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md ${statusClass}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[15px] font-extrabold text-indigo-600 mt-1">
                          {item.price === 0 ? '무료' : `${item.price.toLocaleString()}원/${item.priceType}`}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[11px] text-slate-400 flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-0.5 text-indigo-400" />
                            {item.location}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                            {item.university}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}

              </div>
              </AsyncState>
            </div>
  )
}
