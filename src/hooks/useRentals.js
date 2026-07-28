import { useCallback, useEffect, useState } from 'react'
import * as rentalApi from '../api/rentals'

export function useRentals({ accessToken, currentUserId, enabled, api = rentalApi }) {
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      setRentals(await api.getMyRentals(accessToken))
    } catch (requestError) {
      setError(requestError)
    } finally {
      setLoading(false)
    }
  }, [accessToken, api, enabled])

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    api.getMyRentals(accessToken)
      .then(result => {
        if (active) setRentals(result)
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
  }, [accessToken, api, enabled])

  const transition = useCallback(async (id, action) => {
    const updated = await api[action](id, accessToken)
    setRentals(current => current.map(rental => rental.id === id ? updated : rental))
  }, [accessToken, api])

  return {
    rentals,
    sent: rentals.filter(rental => rental.borrower_id === currentUserId),
    received: rentals.filter(rental => rental.lender_id === currentUserId),
    loading,
    error,
    reload,
    create: payload => api.createRental(payload, accessToken).then(created => {
      setRentals(current => [created, ...current])
      return created
    }),
    transition,
  }
}
