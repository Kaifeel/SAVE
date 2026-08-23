export const ADMIN_STATUS_META = {
  PENDING: { label: '대기', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  REVIEWING: { label: '검토 중', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  RESOLVED: { label: '처리 완료', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  REJECTED: { label: '반려', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatAdminDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date)
}
