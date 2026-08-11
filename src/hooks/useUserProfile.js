import { useCallback, useEffect, useState } from 'react'
import { getPublicUserItems, getPublicUserProfile, getPublicUserReviews } from '../api/users'
import {
  normalizeItemsResponse,
  normalizePublicReviewsResponse,
  normalizePublicUserProfile,
} from '../api/normalizers'

const defaultApi = { getPublicUserItems, getPublicUserProfile, getPublicUserReviews }

export function useUserProfile({
  userId,
  accessToken,
  enabled = true,
  refreshKey = 0,
  api = defaultApi,
}) {
  const [state, setState] = useState({
    profile: null,
    items: [],
    reviews: [],
    loading: Boolean(enabled && userId),
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!enabled || !userId) return undefined
    let active = true

    Promise.all([
      api.getPublicUserProfile(userId, accessToken),
      api.getPublicUserItems(userId, accessToken),
      api.getPublicUserReviews(userId, accessToken),
    ])
      .then(([profile, items, reviews]) => {
        if (!active) return
        setState({
          profile: normalizePublicUserProfile(profile),
          items: normalizeItemsResponse(items),
          reviews: normalizePublicReviewsResponse(reviews),
          loading: false,
          error: null,
        })
      })
      .catch(error => {
        if (active) setState({ profile: null, items: [], reviews: [], loading: false, error })
      })

    return () => { active = false }
  }, [accessToken, api, enabled, refreshKey, reloadKey, userId])

  const reload = useCallback(() => {
    setState(current => ({ ...current, loading: true, error: null }))
    setReloadKey(value => value + 1)
  }, [])

  return { ...state, reload }
}
