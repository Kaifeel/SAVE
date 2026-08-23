export default function ItemBasicsSection({
  type,
  setType,
  title,
  setTitle,
  price,
  setPrice,
  priceType,
  setPriceType,
  pickupLocationId,
  setPickupLocationId,
  pickupLocations,
  description,
  setDescription,
  photoSection,
}) {
  return (
    <div className="space-y-4 text-left">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">거래 종류</label>
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType('rent')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              type === 'rent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            빌려줄래요 (제공)
          </button>
          <button
            type="button"
            onClick={() => setType('want')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              type === 'want' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            빌려주세요 (요청)
          </button>
        </div>
      </div>

      {photoSection}

      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">물품 이름</label>
        <input
          type="text"
          required
          placeholder="예: 군화, 이산수학 전공책, USB 고속 충전기 등"
          value={title}
          onChange={event => setTitle(event.target.value)}
          className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">대여 가격</label>
        <div className="flex space-x-2">
          <input
            type="number"
            required
            placeholder="대여 가격 (0원 입력 시 무료)"
            value={price}
            onChange={event => setPrice(event.target.value)}
            className="flex-1 bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
          />
          <select
            value={priceType}
            onChange={event => setPriceType(event.target.value)}
            className="bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-3 text-xs outline-none transition-all text-slate-800"
          >
            <option value="일">일</option>
            <option value="시간">시간</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="pickup-location" className="block text-xs font-bold text-slate-400 mb-1.5">거래 선호 위치</label>
        <select
          id="pickup-location"
          required
          value={pickupLocationId}
          onChange={event => setPickupLocationId(Number(event.target.value))}
          className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
        >
          <option value="">수령 장소 선택</option>
          {pickupLocations.map(location => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">설명</label>
        <textarea
          rows={3}
          placeholder="물품의 상태, 대여 방법, 반납 방법 등을 작성해 주세요."
          value={description}
          onChange={event => setDescription(event.target.value)}
          className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800 resize-none"
        />
      </div>
    </div>
  )
}
