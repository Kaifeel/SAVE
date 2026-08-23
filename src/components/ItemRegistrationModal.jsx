import { X } from 'lucide-react'
import ItemBasicsSection from './item-editor/ItemBasicsSection.jsx'
import PhotoSection from './item-editor/PhotoSection.jsx'

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
  onClose,
}) {
  if (!isOpen) return null
  const close = onClose || (() => setIsWriteModalOpen(false))

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end transition-opacity duration-300 animate-in fade-in">
      <div className="absolute inset-0" onClick={close}></div>
      <form
        onSubmit={handleCreateItem}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-registration-title"
        className="bg-white rounded-t-[32px] w-full max-h-[90%] overflow-y-auto z-10 p-6 flex flex-col relative animate-in slide-in-from-bottom duration-300"
      >
        <button
          type="button"
          onClick={close}
          aria-label="물품 등록 창 닫기"
          className="absolute top-5 right-5 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="item-registration-title" className="font-extrabold text-slate-800 text-lg mb-5 mt-1">
          {editingItemId ? '대여 물품 수정' : '대여 물품 등록'}
        </h3>

        <ItemBasicsSection
          type={newType}
          setType={setNewType}
          title={newTitle}
          setTitle={setNewTitle}
          price={newPrice}
          setPrice={setNewPrice}
          priceType={newPriceType}
          setPriceType={setNewPriceType}
          pickupLocationId={newPickupLocationId}
          setPickupLocationId={setNewPickupLocationId}
          pickupLocations={pickupLocations}
          description={newDescription}
          setDescription={setNewDescription}
          photoSection={(
            <PhotoSection
              photos={newPhotos}
              onSelect={handlePhotoSelect}
              onRemove={handlePhotoRemove}
            />
          )}
        />

        <div className="flex space-x-3 mt-6">
          <button
            type="button"
            onClick={close}
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
