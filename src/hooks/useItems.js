import { useCallback, useEffect, useState } from 'react'
import {
  createItem,
  deleteItem,
  getItems,
  updateItem,
  updateItemStatus,
} from '../api/items'
import { normalizeItem, normalizeItemsResponse } from '../api/normalizers'

const defaultApi = {
  createItem,
  deleteItem,
  getItems,
  updateItem,
  updateItemStatus,
}

export function useItems({
  universityId,
  accessToken,
  enabled,
  initialItems = [],
  api = defaultApi,
}) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!enabled || !universityId) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.getItems({ university_id: universityId }, accessToken)
      setItems(normalizeItemsResponse(response))
    } catch (requestError) {
      setItems([])
      setError(requestError)
    } finally {
      setLoading(false)
    }
  }, [accessToken, api, enabled, universityId])

  useEffect(() => {
    let active = true
    if (!enabled || !universityId) {
      return () => {
        active = false
      }
    }

    api.getItems({ university_id: universityId }, accessToken)
      .then(response => {
        if (active) {
          setItems(normalizeItemsResponse(response))
          setError(null)
        }
      })
      .catch(requestError => {
        if (active) {
          setItems([])
          setError(requestError)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, api, enabled, universityId])

  const create = useCallback(async payload => {
    const item = normalizeItem(await api.createItem(payload, accessToken))
    setItems(current => [item, ...current])
    return item
  }, [accessToken, api])

  const update = useCallback(async (itemId, payload) => {
    const item = normalizeItem(await api.updateItem(itemId, payload, accessToken))
    setItems(current => current.map(existing => existing.id === itemId ? item : existing))
    return item
  }, [accessToken, api])

  const remove = useCallback(async itemId => {
    if (enabled) await api.deleteItem(itemId, accessToken)
    setItems(current => current.filter(item => item.id !== itemId))
  }, [accessToken, api, enabled])

  const updateStatus = useCallback(async (itemId, status) => {
    const item = normalizeItem(await api.updateItemStatus(itemId, status, accessToken))
    setItems(current => current.map(existing => existing.id === itemId ? item : existing))
    return item
  }, [accessToken, api])

  return {
    items,
    setItems,
    loading,
    error,
    reload,
    create,
    update,
    remove,
    updateStatus,
  }
}
