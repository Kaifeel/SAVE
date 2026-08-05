import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Camera } from 'lucide-react'
import { afterEach, expect, it, vi } from 'vitest'
import ProductDetailPage from './ProductDetailPage'

afterEach(cleanup)

const item = {
  id: 7,
  ownerId: 12,
  title: '우산',
  owner: '나',
  university: '부경대학교',
  location: '누리관 앞',
  price: 1000,
  priceType: '일',
  rating: 0,
  reviews: 0,
  description: '깨끗함',
  status: 'available',
  imageIcon: Camera,
  iconColor: 'text-rose-500 bg-rose-50',
}

it('exposes update and delete actions without a manual rental-state toggle', async () => {
  const user = userEvent.setup()
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  render(<ProductDetailPage
    item={item}
    isOwner
    onClose={vi.fn()}
    onEdit={onEdit}
    onDelete={onDelete}
  />)

  await user.click(screen.getByRole('button', { name: '수정' }))
  await user.click(screen.getByRole('button', { name: '삭제' }))

  expect(onEdit).toHaveBeenCalledWith(item)
  expect(onDelete).toHaveBeenCalledWith(7)
  expect(screen.queryByRole('button', { name: /대여 (중|가능)으로 변경/ }))
    .not.toBeInTheDocument()
})

it('passes the displayed item to the report handler', async () => {
  const user = userEvent.setup()
  const onReport = vi.fn()
  render(<ProductDetailPage
    item={item}
    onClose={vi.fn()}
    onReport={onReport}
  />)

  await user.click(screen.getByRole('button', { name: '악성 유저 신고하기' }))

  expect(onReport).toHaveBeenCalledWith(item)
})

it('opens the displayed item owner profile without exposing a status toggle', async () => {
  const user = userEvent.setup()
  const onOwnerProfile = vi.fn()
  render(<ProductDetailPage
    item={item}
    onClose={vi.fn()}
    onOwnerProfile={onOwnerProfile}
  />)

  await user.click(screen.getByRole('button', { name: '나 프로필 보기' }))

  expect(onOwnerProfile).toHaveBeenCalledWith(item)
  expect(screen.queryByRole('button', { name: /대여 (중|가능)으로 변경/ }))
    .not.toBeInTheDocument()
})
