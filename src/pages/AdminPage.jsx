import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserX,
  X,
} from 'lucide-react'
import {
  deleteAdminItem,
  getAdminReportDetail,
  getAdminReports,
  sanctionAdminUser,
  updateAdminReportStatus,
} from '../api/reports'

const defaultApi = {
  deleteAdminItem,
  getAdminReportDetail,
  getAdminReports,
  sanctionAdminUser,
  updateAdminReportStatus,
}

const STATUS_META = {
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

function normalizeReport(report) {
  return {
    id: report.id,
    reporterId: report.reporter_id ?? report.reporterId,
    reporterName: report.reporter_name ?? report.reporterName,
    reportedUserId: report.reported_user_id ?? report.reportedUserId,
    reportedUserName: report.reported_user_name ?? report.reportedUserName,
    itemId: report.item_id ?? report.itemId,
    itemTitle: report.item_title ?? report.itemTitle,
    chatRoomId: report.chat_room_id ?? report.chatRoomId,
    reason: report.reason || '',
    status: report.status || 'PENDING',
    createdAt: report.created_at ?? report.createdAt,
    handledAt: report.handled_at ?? report.handledAt,
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date)
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export function AdminAccessDenied({ onLogout }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-black">관리자 권한이 필요합니다</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          현재 계정은 관리자 영역에 접근할 수 없습니다.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <a href="/" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900">
            사용자 화면으로
          </a>
          <button type="button" onClick={onLogout} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold">
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    </main>
  )
}

export default function AdminPage({ accessToken, user, onLogout, api = defaultApi }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionKey, setActionKey] = useState('')
  const [sanctionReason, setSanctionReason] = useState('')
  const [notice, setNotice] = useState(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getAdminReports(accessToken)
      setReports((Array.isArray(response) ? response : []).map(normalizeReport))
    } catch (loadError) {
      setError(loadError)
    } finally {
      setLoading(false)
    }
  }, [accessToken, api])

  useEffect(() => {
    let active = true

    api.getAdminReports(accessToken)
      .then(response => {
        if (!active) return
        setReports((Array.isArray(response) ? response : []).map(normalizeReport))
        setError(null)
      })
      .catch(loadError => {
        if (active) setError(loadError)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, api])

  const counts = useMemo(() => reports.reduce((result, report) => ({
    ...result,
    [report.status]: (result[report.status] || 0) + 1,
  }), {}), [reports])

  const filteredReports = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return reports.filter(report => {
      if (statusFilter !== 'ALL' && report.status !== statusFilter) return false
      if (!keyword) return true
      return [
        report.id,
        report.reason,
        report.itemTitle,
        report.itemId,
        report.reporterName,
        report.reporterId,
        report.reportedUserName,
        report.reportedUserId,
      ].some(value => String(value ?? '').toLowerCase().includes(keyword))
    })
  }, [query, reports, statusFilter])

  const replaceReport = useCallback(updated => {
    const normalized = normalizeReport(updated)
    setReports(current => current.map(report => report.id === normalized.id ? normalized : report))
    setSelectedReport(current => current?.id === normalized.id ? normalized : current)
  }, [])

  const openReport = async report => {
    setSelectedReport(report)
    setSanctionReason(report.reason)
    setNotice(null)
    setDetailLoading(true)
    try {
      const detail = normalizeReport(await api.getAdminReportDetail(report.id, accessToken))
      setSelectedReport(detail)
      setSanctionReason(detail.reason)
    } catch (detailError) {
      setNotice({ type: 'error', text: detailError.message || '신고 상세를 불러오지 못했습니다.' })
    } finally {
      setDetailLoading(false)
    }
  }

  const changeStatus = async status => {
    if (!selectedReport) return
    const key = `status-${status}`
    setActionKey(key)
    setNotice(null)
    try {
      const updated = await api.updateAdminReportStatus(selectedReport.id, status, accessToken)
      replaceReport(updated)
      setNotice({ type: 'success', text: `${STATUS_META[status].label} 상태로 변경했습니다.` })
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError.message || '신고 상태를 변경하지 못했습니다.' })
    } finally {
      setActionKey('')
    }
  }

  const removeItem = async () => {
    if (!selectedReport?.itemId) return
    if (!window.confirm('신고된 게시물을 삭제 상태로 변경할까요?')) return
    setActionKey('delete-item')
    setNotice(null)
    try {
      await api.deleteAdminItem(selectedReport.itemId, accessToken)
      setNotice({ type: 'success', text: '게시물을 삭제 상태로 변경했습니다.' })
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError.message || '게시물을 삭제하지 못했습니다.' })
    } finally {
      setActionKey('')
    }
  }

  const sanctionUser = async () => {
    if (!selectedReport?.reportedUserId || !sanctionReason.trim()) return
    if (!window.confirm('신고 대상 사용자를 7일 정지할까요?')) return
    setActionKey('sanction-user')
    setNotice(null)
    try {
      await api.sanctionAdminUser(selectedReport.reportedUserId, {
        status: 'SUSPENDED',
        reason: sanctionReason.trim(),
      }, accessToken)
      setNotice({ type: 'success', text: '신고 대상 사용자를 7일 정지했습니다.' })
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError.message || '사용자를 제재하지 못했습니다.' })
    } finally {
      setActionKey('')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 px-4 py-6 text-slate-300 lg:flex">
          <div className="flex items-center gap-3 px-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-black tracking-wide text-white">SAVE ADMIN</div>
              <div className="text-xs text-slate-500">운영 관리</div>
            </div>
          </div>
          <nav className="mt-8 space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-indigo-500/15 px-3 py-3 text-sm font-bold text-indigo-300">
              <ClipboardList className="h-4 w-4" /> 신고 관리
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600">
              <LayoutDashboard className="h-4 w-4" /> 운영 현황 · 준비 중
            </div>
          </nav>
          <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <div className="truncate text-sm font-bold text-white">{user?.name || '관리자'}</div>
            <div className="truncate text-xs text-slate-500">{user?.email}</div>
            <button type="button" onClick={onLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-800">
              <LogOut className="h-3.5 w-3.5" /> 로그아웃
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Administration</div>
                <h1 className="mt-1 text-2xl font-black">신고 관리</h1>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={loadReports} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                </button>
                <button type="button" onClick={onLogout} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 lg:hidden" aria-label="로그아웃">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

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
                  <button type="button" onClick={loadReports} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">다시 시도</button>
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
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatDate(report.createdAt)}</td>
                          <td className="px-5 py-4"><StatusBadge status={report.status} /></td>
                          <td className="px-5 py-4 text-right">
                            <button type="button" onClick={() => openReport(report)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600">
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
        </main>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onMouseDown={() => setSelectedReport(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <div className="text-xs font-bold text-indigo-600">REPORT #{selectedReport.id}</div>
                <h2 className="mt-1 text-xl font-black">신고 상세 및 처리</h2>
              </div>
              <button type="button" onClick={() => setSelectedReport(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="닫기"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-6 p-6">
              {detailLoading ? <div className="py-20 text-center text-sm text-slate-500">상세 정보를 불러오는 중...</div> : (
                <>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <div className="text-xs font-bold text-slate-400">현재 처리 상태</div>
                      <div className="mt-2"><StatusBadge status={selectedReport.status} /></div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>접수 {formatDate(selectedReport.createdAt)}</div>
                      <div className="mt-1">처리 {formatDate(selectedReport.handledAt)}</div>
                    </div>
                  </div>

                  <section>
                    <h3 className="text-sm font-black">신고 정보</h3>
                    <dl className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
                      {[
                        ['대상 게시물', selectedReport.itemTitle || (selectedReport.itemId ? `#${selectedReport.itemId}` : '-')],
                        ['신고 대상 사용자', selectedReport.reportedUserName || (selectedReport.reportedUserId ? `#${selectedReport.reportedUserId}` : '-')],
                        ['신고자', selectedReport.reporterName || `#${selectedReport.reporterId}`],
                        ['채팅방', selectedReport.chatRoomId ? `#${selectedReport.chatRoomId}` : '-'],
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
                    <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-900">{selectedReport.reason}</p>
                  </section>

                  {notice && (
                    <div className={`rounded-xl px-4 py-3 text-sm font-bold ${notice.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {notice.text}
                    </div>
                  )}

                  <section>
                    <h3 className="text-sm font-black">신고 상태 처리</h3>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button type="button" disabled={Boolean(actionKey)} onClick={() => changeStatus('REVIEWING')} className="rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">검토 시작</button>
                      <button type="button" disabled={Boolean(actionKey)} onClick={() => changeStatus('RESOLVED')} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">처리 완료</button>
                      <button type="button" disabled={Boolean(actionKey)} onClick={() => changeStatus('REJECTED')} className="rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">신고 반려</button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-black text-rose-900"><AlertTriangle className="h-4 w-4" /> 운영 조치</h3>
                    <button type="button" onClick={removeItem} disabled={!selectedReport.itemId || Boolean(actionKey)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                      <Trash2 className="h-4 w-4" /> 신고 게시물 삭제
                    </button>
                    <label className="mt-4 block text-xs font-bold text-slate-600" htmlFor="sanction-reason">사용자 제재 사유</label>
                    <textarea id="sanction-reason" value={sanctionReason} onChange={event => setSanctionReason(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-rose-300" />
                    <button type="button" onClick={sanctionUser} disabled={!selectedReport.reportedUserId || !sanctionReason.trim() || Boolean(actionKey)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                      <UserX className="h-4 w-4" /> 신고 대상 사용자 7일 정지
                    </button>
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
