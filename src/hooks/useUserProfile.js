import { useCallback, useEffect, useState } from 'react'
import { getPublicUserItems, getPublicUserProfile } from '../api/users'
import { normalizeItemsResponse, normalizePublicUserProfile } from '../api/normalizers'

const defaultApi = { getPublicUserItems, getPublicUserProfile }

export function useUserProfile({
  userId,
  accessToken,
  enabled = true,
  api = defaultApi,
}) {
  const [state, setState] = useState({
    profile: null,
    items: [],
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
    ])
      .then(([profile, items]) => {
        if (!active) return
        setState({
          profile: normalizePublicUserProfile(profile),
          items: normalizeItemsResponse(items),
          loading: false,
          error: null,
        })
      })
      .catch(error => {
        if (active) setState({ profile: null, items: [], loading: false, error })
      })

    return () => { active = false }
  }, [accessToken, api, enabled, reloadKey, userId])

  const reload = useCallback(() => {
    setState(current => ({ ...current, loading: true, error: null }))
    setReloadKey(value => value + 1)
  }, [])

  return { ...state, reload }
}
