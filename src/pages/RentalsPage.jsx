import AsyncState from '../components/AsyncState'

const actions = {
  REQUESTED: {
    lender: [['거래 시작', 'startRental'], ['거절', 'rejectRental']],
    borrower: [['요청 취소', 'cancelRental']],
  },
  RENTING: { lender: [['거래 완료', 'returnRental']] },
}

function RentalList({ title, rentals, role, onTransition, pendingAction }) {
  return (
    <section className="mt-5">
      <h2 className="text-sm font-black text-slate-800">{title}</h2>
      <div className="mt-2 space-y-2">
        {rentals.map(rental => (
          <article key={rental.id} className="rounded-xl border bg-white p-4">
            <div className="flex justify-between text-xs">
              <span>물품 #{rental.item_id}</span>
              <strong>{rental.status}</strong>
            </div>
            <div className="mt-3 flex gap-2">
              {(actions[rental.status]?.[role] || []).map(([label, action]) => (
                <button
                  key={action}
                  type="button"
                  disabled={pendingAction?.startsWith(`${rental.id}:`)}
                  onClick={() => onTransition(rental.id, action)}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300"
                >
                  {label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function RentalsPage({ data, onBack }) {
  return (
    <div className="p-5">
      <button type="button" onClick={onBack} className="text-xs font-bold text-indigo-600">마이페이지로</button>
      <h1 className="mt-3 text-xl font-black">대여 내역</h1>
      <AsyncState loading={data.loading} error={data.error} onRetry={data.reload} empty={!data.loading && !data.error && data.rentals.length === 0}>
        <RentalList title="받은 요청" rentals={data.received} role="lender" onTransition={data.transition} pendingAction={data.pendingAction} />
        <RentalList title="보낸 요청" rentals={data.sent} role="borrower" onTransition={data.transition} pendingAction={data.pendingAction} />
      </AsyncState>
    </div>
  )
}
