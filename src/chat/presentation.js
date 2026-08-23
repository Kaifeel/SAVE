const ITEM_STATUS_META = {
  available: ['대여 가능', 'bg-emerald-50 text-emerald-600'],
  request_pending: ['요청 확인 중', 'bg-amber-50 text-amber-600'],
  reserved: ['대여 예약', 'bg-indigo-50 text-indigo-600'],
  rented: ['대여 중', 'bg-rose-50 text-rose-500'],
}

const CHAT_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const CHAT_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function parseChatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function itemStatusMeta(item) {
  return ITEM_STATUS_META[item?.status]
    || ['상태 확인 불가', 'bg-slate-100 text-slate-500']
}

export function getChatDateKey(value) {
  const date = parseChatDate(value)
  if (!date) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatChatDate(value) {
  const date = parseChatDate(value)
  return date ? CHAT_DATE_FORMATTER.format(date) : ''
}

export function formatChatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : CHAT_TIME_FORMATTER.format(date)
}

export function findLinkedItem(items, room) {
  const itemId = room?.itemId ?? room?.raw?.item_id ?? room?.raw?.item?.id
  if (itemId != null) return items.find(item => String(item.id) === String(itemId))
  return items.find(item => item.title === room?.itemTitle)
}
