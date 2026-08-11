import { useCallback, useEffect, useState } from 'react'
import * as rentalApi from '../api/rentals'

export function useRentals({
  accessToken,
  currentUserId,
  enabled,
  api = rentalApi,
  onRentalChanged,
}) {
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)

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
    setPendingAction(`${id}:${action}`)
    try {
      const updated = await api[action](id, accessToken)
      setRentals(current => current.map(rental => rental.id === id ? updated : rental))
      await Promise.allSettled([reload(), onRentalChanged?.()])
      return updated
    } finally {
      setPendingAction(null)
    }
  }, [accessToken, api, onRentalChanged, reload])

  const create = useCallback(async payload => {
    setPendingAction('create')
    try {
      const created = await api.createRental(payload, accessToken)
      setRentals(current => [created, ...current])
      await Promise.allSettled([reload(), onRentalChanged?.()])
      return created
    } finally {
      setPendingAction(null)
    }
  }, [accessToken, api, onRentalChanged, reload])

  const submitReview = useCallback(async (id, review) => {
    setPendingAction(`${id}:submitReview`)
    try {
      const result = await api.submitRentalReview(id, review, accessToken)
      setRentals(current => current.map(rental => rental.id === id
        ? {
            ...rental,
            reviewState: result.review_state ?? result.reviewState ?? rental.reviewState,
            reviewDeadline:
              result.review_deadline ?? result.reviewDeadline ?? rental.reviewDeadline,
          }
        : rental))
      await Promise.allSettled([reload(), onRentalChanged?.()])
      return result
    } finally {
      setPendingAction(null)
    }
  }, [accessToken, api, onRentalChanged, reload])

  return {
    rentals,
    sent: rentals.filter(rental => rental.borrower_id === currentUserId),
    received: rentals.filter(rental => rental.lender_id === currentUserId),
    loading,
    error,
    pendingAction,
    reload,
    create,
    transition,
    submitReview,
  }
}
