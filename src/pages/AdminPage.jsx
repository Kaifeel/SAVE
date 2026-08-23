import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import {
  deleteAdminItem,
  getAdminReportDetail,
  getAdminReports,
  sanctionAdminUser,
  updateAdminReportStatus,
} from '../api/reports.js'
import AdminReportDetail from '../components/admin/AdminReportDetail.jsx'
import AdminReportList from '../components/admin/AdminReportList.jsx'
import { useAdminReports } from '../hooks/useAdminReports.js'

const defaultApi = {
  deleteAdminItem,
  getAdminReportDetail,
  getAdminReports,
  sanctionAdminUser,
  updateAdminReportStatus,
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
  const reports = useAdminReports({ accessToken, api })

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
                <button type="button" onClick={reports.retry} disabled={reports.loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${reports.loading ? 'animate-spin' : ''}`} /> 새로고침
                </button>
                <button type="button" onClick={onLogout} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 lg:hidden" aria-label="로그아웃">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <AdminReportList
            reports={reports.reports}
            counts={reports.counts}
            filteredReports={reports.filteredReports}
            loading={reports.loading}
            error={reports.error}
            query={reports.query}
            setQuery={reports.setQuery}
            statusFilter={reports.statusFilter}
            setStatusFilter={reports.setStatusFilter}
            onRetry={reports.retry}
            onSelect={reports.selectReport}
          />
        </main>
      </div>

      <AdminReportDetail
        report={reports.selectedReport}
        detailLoading={reports.detailLoading}
        notice={reports.notice}
        actionKey={reports.actionKey}
        sanctionReason={reports.sanctionReason}
        setSanctionReason={reports.setSanctionReason}
        onClose={reports.closeReport}
        onUpdateStatus={reports.updateStatus}
        onDeleteItem={reports.deleteItem}
        onSanctionUser={reports.sanctionUser}
      />
    </div>
  )
}
