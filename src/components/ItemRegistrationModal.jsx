import { Image as ImageIcon, X } from 'lucide-react'

export default function ItemRegistrationModal({
  isOpen,
  setIsWriteModalOpen,
  handleCreateItem,
  newType,
  setNewType,
  newPhotos,
  handlePhotoSelect,
  handlePhotoRemove,
  newTitle,
  setNewTitle,
  newPrice,
  setNewPrice,
  newPriceType,
  setNewPriceType,
  newPickupLocationId,
  setNewPickupLocationId,
  pickupLocations,
  newDescription,
  setNewDescription,
  isSubmittingItem,
  editingItemId,
}) {
  if (!isOpen) return null

  return (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end transition-opacity duration-300 animate-in fade-in">
            <div className="absolute inset-0" onClick={() => setIsWriteModalOpen(false)}></div>
            <form 
              onSubmit={handleCreateItem}
              className="bg-white rounded-t-[32px] w-full max-h-[90%] overflow-y-auto z-10 p-6 flex flex-col relative animate-in slide-in-from-bottom duration-300"
            >
              
              <button 
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-slate-800 text-lg mb-5 mt-1">
                {editingItemId ? '대여 물품 수정' : '대여 물품 등록'}
              </h3>

              {/* Form Content */}
              <div className="space-y-4 text-left">
                {/* Type toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">거래 종류</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewType('rent')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        newType === 'rent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      빌려줄래요 (제공)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType('want')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        newType === 'want' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      빌려주세요 (요청)
                    </button>
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-400">
                      사진 <span className="font-semibold text-slate-300">(선택)</span>
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">{newPhotos.length}/5</span>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    <label
                      htmlFor="item-photo-upload"
                      className={`h-20 rounded-xl border border-slate-100 bg-white flex flex-col items-center justify-center gap-1 transition-all ${
                        newPhotos.length >= 5
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/40'
                      }`}
                    >
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                      <span className="text-[11px] font-extrabold text-slate-500">사진 추가</span>
                      <span className="text-[10px] font-semibold text-slate-400">최대 5장까지 등록 가능</span>
                    </label>
                    <input
                      id="item-photo-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={newPhotos.length >= 5}
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />

                    {newPhotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {newPhotos.map((photo, index) => (
                          <div
                            key={`${photo.name}-${index}`}
                            className="min-w-0 rounded-xl bg-white border border-slate-100 px-3 py-2 flex items-center gap-2"
                          >
                            <ImageIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-slate-500 truncate flex-1">
                              {photo.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePhotoRemove(index)}
                              className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center flex-shrink-0"
                              aria-label="사진 삭제"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">물품 이름</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 군화, 이산수학 전공책, USB 고속 충전기 등"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
                  />
                </div>

                {/* Price & Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">대여 가격</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      required
                      placeholder="대여 가격 (0원 입력 시 무료)"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
                    />
                    <select
                      value={newPriceType}
                      onChange={(e) => setNewPriceType(e.target.value)}
                      className="bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-3 text-xs outline-none transition-all text-slate-800"
                    >
                      <option value="일">일</option>
                      <option value="시간">시간</option>
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="pickup-location" className="block text-xs font-bold text-slate-400 mb-1.5">거래 선호 위치</label>
                  <select
                    id="pickup-location"
                    required
                    value={newPickupLocationId}
                    onChange={(e) => setNewPickupLocationId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
                  >
                    <option value="">수령 장소 선택</option>
                    {pickupLocations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">설명</label>
                  <textarea
                    rows={3}
                    placeholder="물품의 상태, 대여 방법, 반납 방법 등을 작성해 주세요."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800 resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-center"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingItem}
                  className="flex-2 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-100 transition-all text-center"
                >
                  {isSubmittingItem
                    ? (editingItemId ? '수정 중...' : '등록 중...')
                    : (editingItemId ? '수정하기' : '등록하기')}
                </button>
              </div>
            </form>
          </div>
  )
}
