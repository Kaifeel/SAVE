import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Camera } from 'lucide-react'
import { afterEach, expect, it, vi } from 'vitest'
import ProductDetailPage from './ProductDetailPage'

afterEach(cleanup)

const item = {
  id: 7,
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

it('exposes update, availability, and delete actions only to the owner', async () => {
  const user = userEvent.setup()
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const onStatusChange = vi.fn()
  render(<ProductDetailPage
    item={item}
    isOwner
    onClose={vi.fn()}
    onEdit={onEdit}
    onDelete={onDelete}
    onStatusChange={onStatusChange}
  />)

  await user.click(screen.getByRole('button', { name: '수정' }))
  await user.click(screen.getByRole('button', { name: '대여 중으로 변경' }))
  await user.click(screen.getByRole('button', { name: '삭제' }))

  expect(onEdit).toHaveBeenCalledWith(item)
  expect(onStatusChange).toHaveBeenCalledWith('RENTED')
  expect(onDelete).toHaveBeenCalledWith(7)
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
