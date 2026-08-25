import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Camera } from 'lucide-react'
import { afterEach, expect, it, vi } from 'vitest'
import ProductDetailPage from './ProductDetailPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

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

it('opens the owner profile from the displayed rating summary', async () => {
  const user = userEvent.setup()
  const onOwnerProfile = vi.fn()
  render(<ProductDetailPage item={item} onClose={vi.fn()} onOwnerProfile={onOwnerProfile} />)

  await user.click(screen.getByRole('button', { name: '작성자 평점 0, 후기 0개 보기' }))

  expect(onOwnerProfile).toHaveBeenCalledWith(item)
})

it('shows the item creation time as a relative age', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-06T12:00:00+09:00'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')

  render(<ProductDetailPage
    item={{ ...item, createdAt: '2026-08-06T11:55:00+09:00' }}
    onClose={vi.fn()}
  />)

  expect(screen.getByText('5분 전')).toBeInTheDocument()
})

it('omits the creation time when it is invalid', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-06T12:00:00+09:00'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')

  render(<ProductDetailPage
    item={{ ...item, createdAt: 'invalid' }}
    onClose={vi.fn()}
  />)

  expect(screen.queryByText(/분 전$/)).not.toBeInTheDocument()
})

it('moves through every item image and shows item-specific precautions', async () => {
  const user = userEvent.setup()
  render(<ProductDetailPage
    item={{
      ...item,
      photos: ['/uploads/umbrella-front.png', '/uploads/umbrella-back.png'],
      precautions: '사용 후 물기를 닦아주세요.',
    }}
    onClose={vi.fn()}
  />)

  expect(screen.getByRole('img', { name: '우산 사진' })).toHaveAttribute(
    'src',
    '/uploads/umbrella-front.png',
  )
  expect(screen.getByRole('img', { name: '우산 사진' })).toHaveClass('object-contain')
  expect(screen.getByRole('img', { name: '우산 사진' })).not.toHaveClass('object-cover')
  expect(screen.getByLabelText('사진 1/2')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '다음 사진' }))
  expect(screen.getByRole('img', { name: '우산 사진' })).toHaveAttribute(
    'src',
    '/uploads/umbrella-back.png',
  )
  expect(screen.getByLabelText('사진 2/2')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '이전 사진' }))
  expect(screen.getByRole('img', { name: '우산 사진' })).toHaveAttribute(
    'src',
    '/uploads/umbrella-front.png',
  )
  expect(screen.getByLabelText('사진 1/2')).toBeInTheDocument()

  expect(screen.getByText('사용 후 물기를 닦아주세요.')).toBeInTheDocument()
  expect(screen.queryByText('#카메라')).not.toBeInTheDocument()
  expect(screen.queryByText('보증금 없음')).not.toBeInTheDocument()
  expect(screen.queryByText('거래 42회')).not.toBeInTheDocument()
})

it('keeps the common safety notice when an item has no specific precautions', () => {
  render(<ProductDetailPage item={item} onClose={vi.fn()} />)

  expect(screen.getByText(/분실 및 파손 시/)).toBeInTheDocument()
  expect(screen.queryByText(/1 \/ 3/)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '다음 사진' })).not.toBeInTheDocument()
})

it('does not treat local upload metadata as a public image URL', () => {
  render(<ProductDetailPage
    item={{ ...item, photos: [{ name: 'draft.png', size: 1024 }] }}
    onClose={vi.fn()}
  />)

  expect(screen.queryByRole('img', { name: '우산 사진' })).not.toBeInTheDocument()
  expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
})

it('passes the displayed item to the share handler', async () => {
  const user = userEvent.setup()
  const onShare = vi.fn()
  render(<ProductDetailPage item={item} onClose={vi.fn()} onShare={onShare} />)

  await user.click(screen.getByRole('button', { name: '공유하기' }))

  expect(onShare).toHaveBeenCalledWith(item)
})
