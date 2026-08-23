import ProductDetailPage from '../ProductDetailPage.jsx'
import UserProfilePage from '../pages/UserProfilePage.jsx'
import ItemRegistrationModal from './ItemRegistrationModal.jsx'
import RentalRequestForm from './RentalRequestForm.jsx'
import ReportModal from './ReportModal.jsx'

export default function AppOverlays({
  itemDetail,
  profile,
  report,
  itemEditor,
  rentalRequest,
}) {
  const { target: profileTarget, ...profileProps } = profile

  return (
    <>
      {itemDetail.item && <ProductDetailPage {...itemDetail} />}
      {profileTarget && (
        <UserProfilePage
          {...profileProps}
          fallbackItem={profileTarget}
        />
      )}
      <ReportModal {...report} item={report.target} isOpen={Boolean(report.target)} />
      <ItemRegistrationModal {...itemEditor} />
      {rentalRequest.request && (
        <div className="absolute inset-0 z-[60] flex items-end bg-black/50 p-4">
          <RentalRequestForm
            item={rentalRequest.request.item}
            chatRoomId={rentalRequest.request.chatRoomId}
            onClose={rentalRequest.onClose}
            onSubmit={rentalRequest.onSubmit}
          />
        </div>
      )}
    </>
  )
}
