import { useCallback, useEffect, useState } from 'react'
import {
  getPickupLocations as loadPickupLocations,
  getUniversities as loadUniversities,
} from '../api/universities'

const defaultApi = {
  getUniversities: loadUniversities,
  getPickupLocations: loadPickupLocations,
}

export function useReferenceData({ universityId, api = defaultApi, enabled = true }) {
  const [universities, setUniversities] = useState([])
  const [pickupLocations, setPickupLocations] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  const reloadUniversities = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      setUniversities(await api.getUniversities())
    } catch (requestError) {
      setError(requestError)
    } finally {
      setLoading(false)
    }
  }, [api, enabled])

  useEffect(() => {
    let active = true
    if (!enabled) {
      return () => {
        active = false
      }
    }
    api.getUniversities()
      .then(entries => {
        if (active) {
          setUniversities(entries)
          setError(null)
        }
      })
      .catch(requestError => {
        if (active) setError(requestError)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [api, enabled])

  useEffect(() => {
    let active = true
    if (!enabled || !universityId) {
      return () => {
        active = false
      }
    }

    api.getPickupLocations(universityId)
      .then(locations => {
        if (active) setPickupLocations(locations)
      })
      .catch(requestError => {
        if (active) setError(requestError)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [api, enabled, universityId])

  return {
    universities,
    pickupLocations: universityId ? pickupLocations : [],
    loading,
    error,
    reloadUniversities,
  }
}
