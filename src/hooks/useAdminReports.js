import { useCallback, useEffect, useMemo, useState } from 'react'
import { ADMIN_STATUS_META } from '../admin/presentation.js'
import { normalizeAdminReport } from '../api/reports.js'

export function useAdminReports({ accessToken, api }) {
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

  const retry = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getAdminReports(accessToken)
      setReports((Array.isArray(response) ? response : []).map(normalizeAdminReport))
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
        setReports((Array.isArray(response) ? response : []).map(normalizeAdminReport))
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
        report.id, report.reason, report.itemTitle, report.itemId,
        report.reporterName, report.reporterId,
        report.reportedUserName, report.reportedUserId,
      ].some(value => String(value ?? '').toLowerCase().includes(keyword))
    })
  }, [query, reports, statusFilter])

  const replaceReport = useCallback(updated => {
    const normalized = normalizeAdminReport(updated)
    setReports(current => current.map(report => report.id === normalized.id ? normalized : report))
    setSelectedReport(current => current?.id === normalized.id ? normalized : current)
  }, [])

  const selectReport = async report => {
    setSelectedReport(report)
    setSanctionReason(report.reason)
    setNotice(null)
    setDetailLoading(true)
    try {
      const detail = normalizeAdminReport(await api.getAdminReportDetail(report.id, accessToken))
      setSelectedReport(detail)
      setSanctionReason(detail.reason)
    } catch (detailError) {
      setNotice({ type: 'error', text: detailError.message || '신고 상세를 불러오지 못했습니다.' })
    } finally {
      setDetailLoading(false)
    }
  }

  const closeReport = () => setSelectedReport(null)

  const updateStatus = async status => {
    if (!selectedReport) return
    setActionKey(`status-${status}`)
    setNotice(null)
    try {
      const updated = await api.updateAdminReportStatus(selectedReport.id, status, accessToken)
      replaceReport(updated)
      setNotice({ type: 'success', text: `${ADMIN_STATUS_META[status].label} 상태로 변경했습니다.` })
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError.message || '신고 상태를 변경하지 못했습니다.' })
    } finally {
      setActionKey('')
    }
  }

  const deleteItem = async () => {
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

  return {
    reports, filteredReports, counts, selectedReport,
    statusFilter, setStatusFilter, query, setQuery,
    loading, error, detailLoading, actionKey, notice,
    sanctionReason, setSanctionReason,
    selectReport, closeReport, updateStatus, deleteItem, sanctionUser, retry,
  }
}
