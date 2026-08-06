import { act, cleanup, render, screen } from '@testing-library/react'
import { Camera } from 'lucide-react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-06T12:00:00+09:00'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const props = {
  searchQuery: '',
  setSearchQuery: vi.fn(),
  recommendItems: [],
  setSelectedItem: vi.fn(),
  homePopularItems: [],
  setActiveTab: vi.fn(),
  filteredItems: [{ id: 7 }],
  recommendationHeadline: '',
  recommendationError: null,
  onRefreshRecommendations: vi.fn(),
}

const recentItem = {
  id: 7,
  title: '우산',
  price: 1000,
  priceType: '일',
  location: '누리관 앞',
  imageIcon: Camera,
  iconColor: 'text-rose-500 bg-rose-50',
  createdAt: '2026-08-06T11:55:00+09:00',
}

it('shows the actual age of each recent item', () => {
  render(<HomePage {...props} recentItems={[recentItem]} />)

  expect(screen.getByText('5분 전')).toBeInTheDocument()
})

it('updates the visible age after one minute', () => {
  render(<HomePage {...props} recentItems={[recentItem]} />)

  act(() => {
    vi.advanceTimersByTime(60_000)
  })

  expect(screen.getByText('6분 전')).toBeInTheDocument()
})

it('omits the age when a recent item has no valid creation time', () => {
  render(<HomePage {...props} recentItems={[{
    ...recentItem,
    id: 8,
    title: '충전기',
    createdAt: undefined,
  }]} />)

  expect(screen.queryByText(/전$/)).not.toBeInTheDocument()
})
