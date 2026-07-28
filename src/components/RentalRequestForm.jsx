import { useState } from 'react'

function calculateTotal(item, start, end) {
  const milliseconds = new Date(end).getTime() - new Date(start).getTime()
  const unit = item.priceType === '시간' ? 3_600_000 : 86_400_000
  return item.price * Math.max(1, Math.ceil(milliseconds / unit))
}

export default function RentalRequestForm({ item, chatRoomId, onSubmit, onClose }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')

  const submit = event => {
    event.preventDefault()
    if (!start || !end || new Date(end) <= new Date(start)) {
      setError('종료일은 시작일 이후여야 합니다.')
      return
    }
    setError('')
    onSubmit({
      item_id: item.id,
      chat_room_id: chatRoomId,
      start_date: new Date(start).toISOString(),
      end_date: new Date(end).toISOString(),
      total_price: calculateTotal(item, start, end),
    })
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-xl">
      <h2 className="text-lg font-black text-slate-900">대여 요청</h2>
      <label className="mt-4 block text-xs font-bold text-slate-600">
        시작일
        <input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} className="mt-1 w-full rounded-lg border p-3" required />
      </label>
      <label className="mt-3 block text-xs font-bold text-slate-600">
        종료일
        <input type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} className="mt-1 w-full rounded-lg border p-3" required />
      </label>
      {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        {onClose && <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-slate-100 py-3 text-xs font-bold">취소</button>}
        <button type="submit" className="flex-1 rounded-lg bg-indigo-600 py-3 text-xs font-bold text-white">대여 요청</button>
      </div>
    </form>
  )
}
