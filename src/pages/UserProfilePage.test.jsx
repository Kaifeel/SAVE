import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import UserProfilePage from './UserProfilePage'

afterEach(cleanup)

const api = {
  getPublicUserProfile: vi.fn().mockResolvedValue({
    id: 12,
    name: '김작성',
    department: '컴퓨터공학과',
    university_name: '부경대학교',
    rating: 0,
    review_count: 0,
    completed_trade_count: 15,
  }),
  getPublicUserItems: vi.fn().mockResolvedValue([{
    id: 7,
    owner_id: 12,
    owner_name: '김작성',
    title: '튼튼한 우산',
    rental_fee: 1000,
    rental_unit: 'DAY',
    status: 'AVAILABLE',
  }]),
}

it('shows exact placeholder scores and opens one of the owner items', async () => {
  const user = userEvent.setup()
  const onSelectItem = vi.fn()
  render(<UserProfilePage
    userId={12}
    accessToken="token"
    api={api}
    onBack={vi.fn()}
    onSelectItem={onSelectItem}
  />)

  expect(await screen.findByRole('heading', { name: '김작성' })).toBeInTheDocument()
  expect(screen.getByText('컴퓨터공학과')).toBeInTheDocument()
  expect(screen.getByText('0.0')).toBeInTheDocument()
  expect(screen.getByText('15')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /튼튼한 우산/ }))
  expect(onSelectItem).toHaveBeenCalledWith(expect.objectContaining({
    id: 7,
    ownerId: 12,
    title: '튼튼한 우산',
  }))
})

it('returns to the item detail and connects reporting', async () => {
  const user = userEvent.setup()
  const onBack = vi.fn()
  const onReport = vi.fn()
  render(<UserProfilePage
    userId={12}
    accessToken="token"
    api={api}
    onBack={onBack}
    onReport={onReport}
  />)

  await screen.findByRole('heading', { name: '김작성' })
  await user.click(screen.getByRole('button', { name: '김작성 신고하기' }))
  await user.click(screen.getByRole('button', { name: '물품 상세로 돌아가기' }))

  expect(onReport).toHaveBeenCalledTimes(1)
  expect(onBack).toHaveBeenCalledTimes(1)
})
