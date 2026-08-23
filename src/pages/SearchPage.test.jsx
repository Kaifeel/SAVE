import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Camera } from 'lucide-react'
import SearchPage from './SearchPage'

afterEach(cleanup)

it('shows an item API error and retries without mock items', async () => {
  const user = userEvent.setup()
  const onRetry = vi.fn()
  render(<SearchPage
    activeBoard="lend"
    setActiveBoard={vi.fn()}
    searchQuery=""
    setSearchQuery={vi.fn()}
    availableOnly={false}
    setAvailableOnly={vi.fn()}
    filteredItems={[]}
    setSelectedItem={vi.fn()}
    loading={false}
    error={new Error('물품을 불러오지 못했습니다.')}
    onRetry={onRetry}
  />)

  expect(screen.getByRole('alert')).toHaveTextContent('물품을 불러오지 못했습니다.')
  await user.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('등록된 물품이 없습니다.')).not.toBeInTheDocument()
})

it.each([
  ['borrow', '대여 희망 물품만 보기'],
  ['lend', '대여 가능 물품만 보기'],
])('shows board-specific availability copy for %s', (activeBoard, label) => {
  render(<SearchPage
    activeBoard={activeBoard}
    setActiveBoard={vi.fn()}
    searchQuery=""
    setSearchQuery={vi.fn()}
    availableOnly={false}
    setAvailableOnly={vi.fn()}
    filteredItems={[]}
    setSelectedItem={vi.fn()}
    loading={false}
    error={null}
    onRetry={vi.fn()}
  />)

  expect(screen.getByText(label)).toBeInTheDocument()
})

it('opens a search result through a keyboard-accessible control', async () => {
  const user = userEvent.setup()
  const item = {
    id: 7,
    title: '우산',
    price: 1000,
    priceType: '일',
    location: '누리관 앞',
    university: '부경대학교',
    status: 'available',
    badge: '신규',
    imageIcon: Camera,
    iconColor: 'bg-slate-100',
  }
  const setSelectedItem = vi.fn()
  render(<SearchPage
    activeBoard="lend"
    setActiveBoard={vi.fn()}
    searchQuery=""
    setSearchQuery={vi.fn()}
    availableOnly={false}
    setAvailableOnly={vi.fn()}
    filteredItems={[item]}
    setSelectedItem={setSelectedItem}
    loading={false}
    error={null}
  />)

  await user.click(screen.getByRole('button', { name: /우산/ }))

  expect(setSelectedItem).toHaveBeenCalledWith(item)
})
