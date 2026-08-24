import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import RentalsPage from './RentalsPage'

afterEach(cleanup)

it('shows only role-appropriate offline transaction actions', async () => {
  const user = userEvent.setup()
  const transition = vi.fn()
  render(<RentalsPage
    onBack={vi.fn()}
    data={{
      loading: false,
      error: null,
      reload: vi.fn(),
      transition,
      pendingAction: null,
      rentals: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      received: [
        { id: 1, item_id: 10, itemTitle: '캠핑 의자', status: 'REQUESTED' },
        { id: 2, item_id: 11, itemTitle: '공학용 계산기', status: 'RENTING' },
      ],
      sent: [
        { id: 3, item_id: 12, itemTitle: '장우산', status: 'REQUESTED' },
        { id: 4, item_id: 13, itemTitle: '노트북 거치대', status: 'RENTING' },
      ],
    }}
  />)

  expect(screen.getByRole('button', { name: '거래 시작' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '요청 거절' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '요청 취소' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '반납 완료 처리' })).toBeInTheDocument()
  expect(screen.getByText('캠핑 의자')).toBeInTheDocument()
  expect(screen.getAllByText('대여 중')).toHaveLength(2)
  expect(screen.queryByText('RENTING')).not.toBeInTheDocument()
  expect(screen.queryByText(/물품 #/)).not.toBeInTheDocument()
  expect(screen.queryByText('승인')).not.toBeInTheDocument()
  expect(screen.queryByText(/결제/)).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '거래 시작' }))
  expect(transition).toHaveBeenCalledWith(1, 'startRental')
})

it('disables every action for a rental while its transition is pending', () => {
  render(<RentalsPage
    onBack={vi.fn()}
    data={{
      loading: false,
      error: null,
      reload: vi.fn(),
      transition: vi.fn(),
      pendingAction: '1:startRental',
      rentals: [{ id: 1 }],
      received: [{ id: 1, item_id: 10, status: 'REQUESTED' }],
      sent: [],
    }}
  />)

  expect(screen.getByRole('button', { name: '거래 시작' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '요청 거절' })).toBeDisabled()
})

it('shows review action and waiting state after return', () => {
  render(<RentalsPage onBack={vi.fn()} data={{
    loading: false, error: null, reload: vi.fn(), transition: vi.fn(),
    pendingAction: null, rentals: [{ id: 5 }, { id: 6 }],
    received: [{ id: 5, item_id: 15, itemTitle: '블루투스 스피커', status: 'RETURNED', reviewState: 'AVAILABLE' }],
    sent: [{ id: 6, item_id: 16, itemTitle: '미니 빔프로젝터', status: 'RETURNED', reviewState: 'SUBMITTED_WAITING' }],
  }} />)
  expect(screen.getByRole('button', { name: '후기 작성' })).toBeInTheDocument()
  expect(screen.getAllByText('반납 완료')).toHaveLength(2)
  expect(screen.getByText('후기를 작성했어요. 상대방의 후기를 기다리고 있습니다.')).toBeInTheDocument()
})

it('shows human-friendly rental details and empty section guidance', () => {
  render(<RentalsPage onBack={vi.fn()} data={{
    loading: false, error: null, reload: vi.fn(), transition: vi.fn(),
    pendingAction: null, rentals: [{ id: 7 }], received: [],
    sent: [{
      id: 7,
      item_id: 1,
      status: 'RETURNED',
      reviewState: 'PUBLISHED',
      startDate: '2026-08-23T10:00:00',
      endDate: '2026-08-24T10:00:00',
      totalPrice: 3000,
      lenderName: '김대여',
    }],
  }} items={[{ id: 1, title: '튼튼한 장우산', location: '누리관 앞' }]} />)

  expect(screen.getByText('튼튼한 장우산')).toBeInTheDocument()
  expect(screen.getByText('3,000원')).toBeInTheDocument()
  expect(screen.getByText('김대여님에게 보낸 요청')).toBeInTheDocument()
  expect(screen.getByText('표시할 요청이 없습니다.')).toBeInTheDocument()
  expect(screen.getByText('서로의 후기가 공개되었습니다.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '마이페이지로 돌아가기' })).toBeInTheDocument()
  expect(screen.queryByText('마이페이지로')).not.toBeInTheDocument()
})
