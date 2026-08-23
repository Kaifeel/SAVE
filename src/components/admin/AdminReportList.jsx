import { AlertTriangle, CheckCircle2, Eye, Search } from 'lucide-react'
import { formatAdminDate } from '../../admin/presentation.js'
import AdminStatusBadge from './AdminStatusBadge.jsx'

export default function AdminReportList({
  reports,
  counts,
  filteredReports,
  loading,
  error,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  onRetry,
  onSelect,
}) {
  return (
    <div className="mx-auto max-w-7xl p-5 sm:p-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['전체 신고', reports.length, 'bg-slate-900 text-white'],
          ['처리 대기', counts.PENDING || 0, 'bg-amber-50 text-amber-800'],
          ['검토 중', counts.REVIEWING || 0, 'bg-blue-50 text-blue-800'],
          ['처리 완료', counts.RESOLVED || 0, 'bg-emerald-50 text-emerald-800'],
        ].map(([label, value, className]) => (
          <div key={label} className={`rounded-2xl p-5 shadow-sm ${className}`}>
            <div className="text-sm font-bold opacity-70">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="신고 사유, 게시물, 사용자 검색" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 outline-none">
            <option value="ALL">전체 상태</option>
            <option value="PENDING">대기</option>
            <option value="REVIEWING">검토 중</option>
            <option value="RESOLVED">처리 완료</option>
            <option value="REJECTED">반려</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">신고 목록을 불러오는 중...</div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="mt-3 text-sm font-bold text-slate-700">{error.message || '신고 목록을 불러오지 못했습니다.'}</p>
            <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">다시 시도</button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-slate-400">
            <CheckCircle2 className="h-9 w-9" />
            <p className="mt-3 text-sm font-bold">조건에 맞는 신고가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">번호</th>
                  <th className="px-5 py-3">신고 대상</th>
                  <th className="px-5 py-3">신고 사유</th>
                  <th className="px-5 py-3">신고자</th>
                  <th className="px-5 py-3">접수 일시</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3 text-right">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-bold text-slate-500">#{report.id}</td>
                    <td className="px-5 py-4">
                      <div className="max-w-52 truncate font-bold">{report.itemTitle || (report.itemId ? `게시물 #${report.itemId}` : `사용자 #${report.reportedUserId || '-'}`)}</div>
                      {report.reportedUserName && <div className="mt-1 text-xs text-slate-400">{report.reportedUserName}</div>}
                    </td>
                    <td className="px-5 py-4"><div className="max-w-64 truncate text-slate-600">{report.reason}</div></td>
                    <td className="px-5 py-4">{report.reporterName || `#${report.reporterId}`}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatAdminDate(report.createdAt)}</td>
                    <td className="px-5 py-4"><AdminStatusBadge status={report.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => onSelect(report)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600">
                        <Eye className="h-3.5 w-3.5" /> 상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
