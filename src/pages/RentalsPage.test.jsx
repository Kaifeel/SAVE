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
        { id: 1, item_id: 10, status: 'REQUESTED' },
        { id: 2, item_id: 11, status: 'RENTING' },
      ],
      sent: [
        { id: 3, item_id: 12, status: 'REQUESTED' },
        { id: 4, item_id: 13, status: 'RENTING' },
      ],
    }}
  />)

  expect(screen.getByRole('button', { name: '거래 시작' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '거절' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '요청 취소' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '거래 완료' })).toBeInTheDocument()
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
  expect(screen.getByRole('button', { name: '거절' })).toBeDisabled()
})
