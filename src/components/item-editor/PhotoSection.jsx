import { Image as ImageIcon, X } from 'lucide-react'

export default function PhotoSection({ photos, onSelect, onRemove }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold text-slate-400">
          사진 <span className="font-semibold text-slate-300">(선택)</span>
        </label>
        <span className="text-[10px] font-bold text-slate-400">{photos.length}/5</span>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
        <label
          htmlFor="item-photo-upload"
          className={`h-20 rounded-xl border border-slate-100 bg-white flex flex-col items-center justify-center gap-1 transition-all ${
            photos.length >= 5
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
          disabled={photos.length >= 5}
          onChange={onSelect}
          className="hidden"
        />

        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {photos.map((photo, index) => (
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
                  onClick={() => onRemove(index)}
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
  )
}
