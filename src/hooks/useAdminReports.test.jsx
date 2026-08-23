import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAdminReports } from './useAdminReports.js'

const pendingReport = {
  id: 10,
  reporter_id: 2,
  reporter_name: '신고자',
  reported_user_id: 3,
  reported_user_name: '신고 대상',
  item_id: 7,
  item_title: '허위 카메라 게시물',
  reason: '실제 설명과 다른 물품입니다.',
  status: 'PENDING',
}

function createApi() {
  return {
    getAdminReports: vi.fn().mockResolvedValue([pendingReport]),
    getAdminReportDetail: vi.fn().mockResolvedValue(pendingReport),
    updateAdminReportStatus: vi.fn().mockImplementation((id, status) => Promise.resolve({
      ...pendingReport, id, status,
    })),
    deleteAdminItem: vi.fn().mockResolvedValue(null),
    sanctionAdminUser: vi.fn().mockResolvedValue(null),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAdminReports', () => {
  it('loads, filters, and opens normalized report detail', async () => {
    const api = createApi()
    const { result } = renderHook(() => useAdminReports({ accessToken: 'jwt', api }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.reports[0]).toMatchObject({ id: 10, reporterName: '신고자' })
    act(() => result.current.setQuery('없는 검색어'))
    expect(result.current.filteredReports).toEqual([])
    act(() => result.current.setQuery('카메라'))
    expect(result.current.filteredReports).toHaveLength(1)

    await act(() => result.current.selectReport(result.current.reports[0]))
    expect(api.getAdminReportDetail).toHaveBeenCalledWith(10, 'jwt')
    expect(result.current.selectedReport.itemTitle).toBe('허위 카메라 게시물')
  })

  it('updates report status in both list and detail state', async () => {
    const api = createApi()
    const { result } = renderHook(() => useAdminReports({ accessToken: 'jwt', api }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.selectReport(result.current.reports[0]))

    await act(() => result.current.updateStatus('REVIEWING'))

    expect(api.updateAdminReportStatus).toHaveBeenCalledWith(10, 'REVIEWING', 'jwt')
    expect(result.current.reports[0].status).toBe('REVIEWING')
    expect(result.current.notice).toEqual({ type: 'success', text: '검토 중 상태로 변경했습니다.' })
  })

  it('deletes the selected item after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const api = createApi()
    const { result } = renderHook(() => useAdminReports({ accessToken: 'jwt', api }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.selectReport(result.current.reports[0]))

    await act(() => result.current.deleteItem())

    expect(api.deleteAdminItem).toHaveBeenCalledWith(7, 'jwt')
    expect(result.current.notice.text).toBe('게시물을 삭제 상태로 변경했습니다.')
  })

  it('sanctions the selected user with the trimmed reason', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const api = createApi()
    const { result } = renderHook(() => useAdminReports({ accessToken: 'jwt', api }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.selectReport(result.current.reports[0]))
    act(() => result.current.setSanctionReason('  반복 신고 대상  '))

    await act(() => result.current.sanctionUser())

    expect(api.sanctionAdminUser).toHaveBeenCalledWith(3, {
      status: 'SUSPENDED',
      reason: '반복 신고 대상',
    }, 'jwt')
  })

  it('exposes a retryable load error', async () => {
    const api = createApi()
    api.getAdminReports.mockRejectedValueOnce(new Error('load failed'))
    const { result } = renderHook(() => useAdminReports({ accessToken: 'jwt', api }))

    await waitFor(() => expect(result.current.error?.message).toBe('load failed'))
    api.getAdminReports.mockResolvedValue([pendingReport])
    await act(() => result.current.retry())

    expect(result.current.error).toBe(null)
    expect(result.current.reports).toHaveLength(1)
  })
})
