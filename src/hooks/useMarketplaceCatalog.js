import { useMemo, useState } from 'react'
import { availableItems } from '../utils/itemVisibility.js'

export function useMarketplaceCatalog({
  items,
  apiEnabled,
  memberUniversityId,
  university,
  recommendedItems,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBoard, setActiveBoard] = useState('borrow')
  const [availableOnly, setAvailableOnly] = useState(false)

  const campusItems = useMemo(() => items.filter(item => {
    if (apiEnabled && memberUniversityId && item.universityId !== memberUniversityId) return false
    if (!apiEnabled && item.university !== university) return false
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(query)
      || item.location.toLowerCase().includes(query)
  }), [apiEnabled, items, memberUniversityId, searchQuery, university])

  const filteredItems = useMemo(() => {
    const boardItems = campusItems.filter(item => {
      const isWantPost = item.type === 'want'
      if (activeBoard === 'borrow' && !isWantPost) return false
      if (activeBoard === 'lend' && isWantPost) return false
      if (availableOnly && item.status !== 'available') return false
      return true
    })

    return [...boardItems].sort((left, right) => {
      if (left.status === 'rented' && right.status !== 'rented') return -1
      if (left.status !== 'rented' && right.status === 'rented') return 1
      return 0
    })
  }, [activeBoard, availableOnly, campusItems])

  const recommendItems = availableItems(apiEnabled
    ? recommendedItems
    : campusItems.filter(item => item.section === 'recommend'))
  const popularItems = useMemo(
    () => campusItems.filter(item => item.section === 'popular'),
    [campusItems],
  )
  const homePopularItems = useMemo(
    () => availableItems(apiEnabled
      ? campusItems
        .filter(item => Number(item.viewCount) > 0)
        .sort((left, right) => Number(right.viewCount) - Number(left.viewCount))
      : popularItems).slice(0, 4),
    [apiEnabled, campusItems, popularItems],
  )
  const recentItems = useMemo(
    () => campusItems.filter(item => item.section === 'recent'),
    [campusItems],
  )

  return {
    searchQuery,
    setSearchQuery,
    activeBoard,
    setActiveBoard,
    availableOnly,
    setAvailableOnly,
    campusItems,
    filteredItems,
    recommendItems,
    popularItems,
    homePopularItems,
    recentItems,
  }
}
