import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AdminPage, { AdminAccessDenied } from './AdminPage'

const pendingReport = {
  id: 10,
  reporter_id: 2,
  reporter_name: '신고자',
  reported_user_id: 3,
  reported_user_name: '신고 대상',
  item_id: 7,
  item_title: '허위 카메라 게시물',
  chat_room_id: null,
  reason: '실제 설명과 다른 물품입니다.',
  status: 'PENDING',
  created_at: '2026-08-02T12:51:07',
  handled_at: null,
}

function createApi() {
  return {
    getAdminReports: vi.fn().mockResolvedValue([pendingReport]),
    getAdminReportDetail: vi.fn().mockResolvedValue(pendingReport),
    updateAdminReportStatus: vi.fn().mockImplementation((id, status) => Promise.resolve({
      ...pendingReport,
      id,
      status,
      handled_at: '2026-08-02T13:00:00',
    })),
    deleteAdminItem: vi.fn(),
    sanctionAdminUser: vi.fn(),
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('loads reports and changes a report to reviewing from the detail panel', async () => {
  const api = createApi()
  render(<AdminPage
    accessToken="admin-jwt"
    user={{ name: '관리자', email: 'admin@pukyong.ac.kr' }}
    onLogout={vi.fn()}
    api={api}
  />)

  expect(await screen.findByText('허위 카메라 게시물')).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: '신고자' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '상세' }))
  await waitFor(() => expect(api.getAdminReportDetail).toHaveBeenCalledWith(10, 'admin-jwt'))

  fireEvent.click(screen.getByRole('button', { name: '검토 시작' }))
  await waitFor(() => {
    expect(api.updateAdminReportStatus).toHaveBeenCalledWith(10, 'REVIEWING', 'admin-jwt')
  })
  expect(await screen.findByText('검토 중 상태로 변경했습니다.')).toBeInTheDocument()
})

it('shows an access denied screen for a non-admin account', () => {
  render(<AdminAccessDenied onLogout={vi.fn()} />)

  expect(screen.getByText('관리자 권한이 필요합니다')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '사용자 화면으로' })).toHaveAttribute('href', '/')
})
