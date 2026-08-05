import { useCallback, useEffect, useState } from 'react'
import { getMyInfo, getMyItems, getMyWishlist } from '../api/users'
import { getMyRentals } from '../api/rentals'
import { normalizeItemsResponse } from '../api/normalizers'

const defaultApi = { getMyInfo, getMyItems, getMyWishlist, getMyRentals }

const emptySection = { data: null, loading: true, error: null }

export function useMyPageData({ accessToken, enabled, api = defaultApi }) {
  const [sections, setSections] = useState({
    profile: emptySection,
    items: emptySection,
    wishlist: emptySection,
    rentals: emptySection,
  })

  const reload = useCallback(async () => {
    if (!enabled) return
    setSections(current => Object.fromEntries(
      Object.entries(current).map(([key, section]) => [
        key, { ...section, loading: true, error: null },
      ]),
    ))
    const requests = {
      profile: api.getMyInfo(accessToken),
      items: api.getMyItems(accessToken),
      wishlist: api.getMyWishlist(accessToken),
      rentals: api.getMyRentals(accessToken),
    }
    await Promise.allSettled(Object.entries(requests).map(([key, request]) => (
      Promise.resolve(request)
        .then(data => {
          const normalized = key === 'items' || key === 'wishlist'
            ? normalizeItemsResponse(data)
            : data
          setSections(current => ({
            ...current,
            [key]: { data: normalized, loading: false, error: null },
          }))
        })
        .catch(error => {
          setSections(current => ({
            ...current,
            [key]: { data: null, loading: false, error },
          }))
        })
    )))
  }, [accessToken, api, enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...sections, reload }
}
