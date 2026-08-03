import { AlertTriangle, X } from 'lucide-react'

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 1000

export default function ReportModal({
  isOpen,
  item,
  reason,
  setReason,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  if (!isOpen || !item) return null

  const trimmedLength = reason.trim().length
  const canSubmit = trimmedLength >= MIN_REASON_LENGTH && !isSubmitting

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <div
      className="absolute inset-0 z-[70] flex items-end bg-slate-950/45 sm:items-center sm:justify-center sm:p-5"
      onMouseDown={handleClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Report</span>
            </div>
            <h2 id="report-modal-title" className="mt-1 text-lg font-black text-slate-900">게시물 신고</h2>
          </div>
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40" aria-label="신고 창 닫기">
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-[11px] font-bold text-slate-400">신고 대상</div>
            <div className="mt-1 truncate text-sm font-black text-slate-800">{item.title}</div>
            <div className="mt-1 text-xs text-slate-500">작성자 {item.owner || '사용자'}</div>
          </div>

          <div>
            <label htmlFor="report-reason" className="text-sm font-black text-slate-800">신고 사유</label>
            <p className="mt-1 text-xs leading-5 text-slate-500">문제가 된 내용을 10자 이상 구체적으로 작성해 주세요.</p>
            <textarea
              id="report-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              maxLength={MAX_REASON_LENGTH}
              rows={6}
              autoFocus
              disabled={isSubmitting}
              placeholder="예: 게시물의 사진과 실제 물품 상태가 다릅니다."
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-50 disabled:bg-slate-50"
            />
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className={reason.length > 0 && trimmedLength < MIN_REASON_LENGTH ? 'font-bold text-rose-500' : 'text-slate-400'}>
                {reason.length > 0 && trimmedLength < MIN_REASON_LENGTH ? `${MIN_REASON_LENGTH - trimmedLength}자 더 입력해 주세요.` : '최소 10자'}
              </span>
              <span className="font-bold text-slate-400">{reason.length} / {MAX_REASON_LENGTH}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-1">
            <button type="button" onClick={handleClose} disabled={isSubmitting} className="h-12 rounded-xl border border-slate-200 text-sm font-black text-slate-600 disabled:opacity-40">
              취소
            </button>
            <button type="submit" disabled={!canSubmit} className="h-12 rounded-xl bg-rose-600 text-sm font-black text-white shadow-lg shadow-rose-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
              {isSubmitting ? '접수 중...' : '신고 접수'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
