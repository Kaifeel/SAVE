import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMarketplaceCatalog } from './useMarketplaceCatalog.js'

const items = [
  { id: 1, title: '우산', location: '누리관', universityId: 1, university: '부경대학교', type: 'rent', status: 'available', section: 'popular' },
  { id: 2, title: '계산기', location: '도서관', universityId: 1, university: '부경대학교', type: 'want', status: 'rented', section: 'recent' },
  { id: 3, title: '충전기', location: '학생회관', universityId: 2, university: '다른대학교', type: 'rent', status: 'available', section: 'recommend' },
]

describe('useMarketplaceCatalog', () => {
  it('filters API campus items by university and query', () => {
    const { result } = renderHook(() => useMarketplaceCatalog({
      items,
      apiEnabled: true,
      memberUniversityId: 1,
      university: '부경대학교',
      recommendedItems: [],
    }))

    act(() => result.current.setSearchQuery('도서'))

    expect(result.current.campusItems.map(item => item.id)).toEqual([2])
  })

  it('applies board and availability filters with the existing rented-first order', () => {
    const { result } = renderHook(() => useMarketplaceCatalog({
      items,
      apiEnabled: true,
      memberUniversityId: 1,
      university: '부경대학교',
      recommendedItems: [],
    }))

    expect(result.current.filteredItems.map(item => item.id)).toEqual([2])
    act(() => {
      result.current.setActiveBoard('lend')
      result.current.setAvailableOnly(true)
    })
    expect(result.current.filteredItems.map(item => item.id)).toEqual([1])
  })

  it('keeps only available API recommendations and home popular items', () => {
    const { result } = renderHook(() => useMarketplaceCatalog({
      items,
      apiEnabled: true,
      memberUniversityId: 1,
      university: '부경대학교',
      recommendedItems: [items[0], items[1]],
    }))

    expect(result.current.recommendItems.map(item => item.id)).toEqual([1])
    expect(result.current.homePopularItems.map(item => item.id)).toEqual([1])
    expect(result.current.recentItems.map(item => item.id)).toEqual([2])
  })
})
