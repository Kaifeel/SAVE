import { useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  CircleCheck,
  UserRound,
  WalletCards,
} from 'lucide-react'
import AsyncState from '../components/AsyncState'
import ReviewFormModal from '../components/ReviewFormModal'

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

const reviewLabels = {
  AVAILABLE: '반납이 완료됐어요. 거래 후기를 남겨주세요.',
  SUBMITTED_WAITING: '후기를 작성했어요. 상대방의 후기를 기다리고 있습니다.',
  PUBLISHED: '서로의 후기가 공개되었습니다.',
  EXPIRED: '후기 작성 기간이 종료되었습니다.',
}

const statusMeta = {
  REQUESTED: {
    lender: ['응답 필요', 'bg-amber-50 text-amber-700'],
    borrower: ['승인 대기', 'bg-amber-50 text-amber-700'],
  },
  APPROVED: ['대여 예정', 'bg-blue-50 text-blue-700'],
  PAID: ['결제 완료', 'bg-blue-50 text-blue-700'],
  RENTING: ['대여 중', 'bg-indigo-50 text-indigo-700'],
  RETURNED: ['반납 완료', 'bg-slate-100 text-slate-600'],
  REJECTED: ['요청 거절', 'bg-rose-50 text-rose-700'],
  CANCELED: ['요청 취소', 'bg-slate-100 text-slate-600'],
}

const actions = {
  REQUESTED: {
    lender: [
      { label: '거래 시작', action: 'startRental', variant: 'primary' },
      { label: '요청 거절', action: 'rejectRental', variant: 'danger' },
    ],
    borrower: [
      { label: '요청 취소', action: 'cancelRental', variant: 'secondary' },
    ],
  },
  RENTING: {
    lender: [
      { label: '반납 완료 처리', action: 'returnRental', variant: 'primary' },
    ],
  },
}

function getStatusMeta(status, role) {
  const meta = statusMeta[status]
  if (meta && !Array.isArray(meta)) return meta[role]
  return meta || ['상태 확인 필요', 'bg-slate-100 text-slate-600']
}

function formatPeriod(startDate, endDate) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return `${DATE_FORMATTER.format(start)} ~ ${DATE_FORMATTER.format(end)}`
}

function formatPrice(totalPrice) {
  if (totalPrice == null || Number.isNaN(Number(totalPrice))) return null
  if (Number(totalPrice) === 0) return '무료'
  return `${Number(totalPrice).toLocaleString('ko-KR')}원`
}

function actionClass(variant) {
  if (variant === 'danger') {
    return 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
  }
  if (variant === 'secondary') {
    return 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }
  return 'bg-indigo-600 text-white shadow-sm shadow-indigo-100 hover:bg-indigo-700'
}

function RentalCard({ rental, role, items, onTransition, onReview, pendingAction }) {
  const itemId = rental.item_id ?? rental.itemId
  const item = items.find(entry => String(entry.id) === String(itemId))
  const title = rental.itemTitle || rental.item_title || item?.title || '대여 물품'
  const [statusLabel, statusClassName] = getStatusMeta(rental.status, role)
  const period = formatPeriod(
    rental.startDate ?? rental.start_date,
    rental.endDate ?? rental.end_date,
  )
  const price = formatPrice(rental.totalPrice ?? rental.total_price)
  const counterpart = role === 'lender'
    ? rental.borrowerName || rental.borrower_name || rental.borrower?.name
    : rental.lenderName || rental.lender_name || rental.lender?.name || item?.owner
  const counterpartName = counterpart
    ? `${counterpart}${String(counterpart).endsWith('님') ? '' : '님'}`
    : null
  const counterpartText = counterpartName
    ? role === 'lender'
      ? `${counterpartName}이 보낸 요청`
      : `${counterpartName}에게 보낸 요청`
    : '거래 상대방 정보를 확인할 수 없습니다.'
  const availableActions = actions[rental.status]?.[role] || []
  const reviewLabel = reviewLabels[rental.reviewState]
  const isPending = pendingAction?.startsWith(`${rental.id}:`)
  const hasActions = availableActions.length > 0 || rental.reviewState === 'AVAILABLE'

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-black text-slate-900">{title}</h3>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClassName}`}>
          {statusLabel}
        </span>
      </div>

      {(period || price || counterpartText) && (
        <div className="mt-3 space-y-2">
          {counterpartText && (
            <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <UserRound aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span>{counterpartText}</span>
            </p>
          )}
          {period && (
            <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span>{period}</span>
            </p>
          )}
          {price && (
            <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <WalletCards aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span>{price}</span>
            </p>
          )}
        </div>
      )}

      {reviewLabel && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[10px] font-bold leading-4 text-emerald-600">
          <CircleCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{reviewLabel}</span>
        </p>
      )}

      {hasActions && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {availableActions.map(({ label, action, variant }) => (
            <button
              key={action}
              type="button"
              disabled={isPending}
              onClick={() => onTransition(rental.id, action)}
              className={`min-w-[104px] flex-1 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${actionClass(variant)}`}
            >
              {label}
            </button>
          ))}
          {rental.reviewState === 'AVAILABLE' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onReview(rental.id)}
              className="min-w-[104px] flex-1 rounded-xl bg-amber-500 px-3 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-amber-100 transition-colors hover:bg-amber-600 disabled:bg-slate-300"
            >
              후기 작성
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function RentalList({ title, rentals, role, items, onTransition, onReview, pendingAction }) {
  return (
    <section>
      <h2 className="text-sm font-black text-slate-900">{title}</h2>

      {rentals.length === 0 ? (
        <p className="mt-4 text-xs font-medium text-slate-400">표시할 요청이 없습니다.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {rentals.map(rental => (
            <RentalCard
              key={rental.id}
              rental={rental}
              role={role}
              items={items}
              onTransition={onTransition}
              onReview={onReview}
              pendingAction={pendingAction}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function RentalsPage({ data, items = [], onBack, onError }) {
  const [reviewRentalId, setReviewRentalId] = useState(null)
  const reviewPending = data.pendingAction === `${reviewRentalId}:submitReview`

  const submitReview = async review => {
    try {
      await data.submitReview(reviewRentalId, review)
      setReviewRentalId(null)
    } catch (error) {
      onError?.(error.message || '후기를 제출하지 못했습니다.')
    }
  }

  return (
    <div className="min-h-full px-3.5 py-5 sm:px-5">
      <header className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="마이페이지로 돌아가기"
          className="-ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
        >
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-black tracking-tight text-slate-950">대여 내역</h1>
      </header>

      <div className="mt-6">
        <AsyncState
          loading={data.loading}
          error={data.error}
          onRetry={data.reload}
          empty={!data.loading && !data.error && data.rentals.length === 0}
          emptyMessage="아직 대여 내역이 없습니다. 마음에 드는 물품을 찾아 대여를 시작해 보세요."
        >
          <div className="space-y-7">
            <RentalList
              title="받은 요청"
              rentals={data.received}
              role="lender"
              items={items}
              onTransition={data.transition}
              onReview={setReviewRentalId}
              pendingAction={data.pendingAction}
            />
            <RentalList
              title="보낸 요청"
              rentals={data.sent}
              role="borrower"
              items={items}
              onTransition={data.transition}
              onReview={setReviewRentalId}
              pendingAction={data.pendingAction}
            />
          </div>
        </AsyncState>
      </div>

      {reviewRentalId != null && (
        <ReviewFormModal
          isOpen
          isSubmitting={reviewPending}
          onClose={() => setReviewRentalId(null)}
          onSubmit={submitReview}
        />
      )}
    </div>
  )
}
