import { AlertTriangle, Trash2, UserX, X } from 'lucide-react'
import { formatAdminDate } from '../../admin/presentation.js'
import AdminStatusBadge from './AdminStatusBadge.jsx'

export default function AdminReportDetail({
  report,
  detailLoading,
  notice,
  actionKey,
  sanctionReason,
  setSanctionReason,
  onClose,
  onUpdateStatus,
  onDeleteItem,
  onSanctionUser,
}) {
  if (!report) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <div className="text-xs font-bold text-indigo-600">REPORT #{report.id}</div>
            <h2 className="mt-1 text-xl font-black">신고 상세 및 처리</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-6">
          {detailLoading ? <div className="py-20 text-center text-sm text-slate-500">상세 정보를 불러오는 중...</div> : (
            <>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-400">현재 처리 상태</div>
                  <div className="mt-2"><AdminStatusBadge status={report.status} /></div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>접수 {formatAdminDate(report.createdAt)}</div>
                  <div className="mt-1">처리 {formatAdminDate(report.handledAt)}</div>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-black">신고 정보</h3>
                <dl className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
                  {[
                    ['대상 게시물', report.itemTitle || (report.itemId ? `#${report.itemId}` : '-')],
                    ['신고 대상 사용자', report.reportedUserName || (report.reportedUserId ? `#${report.reportedUserId}` : '-')],
                    ['신고자', report.reporterName || `#${report.reporterId}`],
                    ['채팅방', report.chatRoomId ? `#${report.chatRoomId}` : '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-4 py-3 text-sm">
                      <dt className="w-32 flex-shrink-0 font-bold text-slate-500">{label}</dt>
                      <dd className="min-w-0 font-semibold text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-black">신고 사유</h3>
                <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-900">{report.reason}</p>
              </section>

              {notice && (
                <div className={`rounded-xl px-4 py-3 text-sm font-bold ${notice.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {notice.text}
                </div>
              )}

              <section>
                <h3 className="text-sm font-black">신고 상태 처리</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button type="button" disabled={Boolean(actionKey)} onClick={() => onUpdateStatus('REVIEWING')} className="rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">검토 시작</button>
                  <button type="button" disabled={Boolean(actionKey)} onClick={() => onUpdateStatus('RESOLVED')} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">처리 완료</button>
                  <button type="button" disabled={Boolean(actionKey)} onClick={() => onUpdateStatus('REJECTED')} className="rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">신고 반려</button>
                </div>
              </section>

              <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
                <h3 className="flex items-center gap-2 text-sm font-black text-rose-900"><AlertTriangle className="h-4 w-4" /> 운영 조치</h3>
                <button type="button" onClick={onDeleteItem} disabled={!report.itemId || Boolean(actionKey)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                  <Trash2 className="h-4 w-4" /> 신고 게시물 삭제
                </button>
                <label className="mt-4 block text-xs font-bold text-slate-600" htmlFor="sanction-reason">사용자 제재 사유</label>
                <textarea id="sanction-reason" value={sanctionReason} onChange={event => setSanctionReason(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-rose-300" />
                <button type="button" onClick={onSanctionUser} disabled={!report.reportedUserId || !sanctionReason.trim() || Boolean(actionKey)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                  <UserX className="h-4 w-4" /> 신고 대상 사용자 7일 정지
                </button>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
