import { useEffect, useRef } from 'react'
import { getItemDetail } from '../api/items.js'
import { normalizeItem } from '../api/normalizers/items.js'
import { clearSharedItemId, getSharedItemId } from '../utils/itemShare.js'

export function useSharedItemRoute({
  enabled,
  apiEnabled,
  accessToken,
  items,
  onSelect,
  onError,
}) {
  const handledItemId = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined

    const itemId = getSharedItemId()
    if (!itemId) {
      handledItemId.current = null
      return undefined
    }
    if (handledItemId.current === itemId) return undefined

    handledItemId.current = itemId
    const localItem = items.find(item => Number(item.id) === itemId)
    if (localItem) {
      onSelect(localItem)
      return undefined
    }
    if (!apiEnabled) return undefined

    let active = true
    getItemDetail(itemId, accessToken)
      .then(normalizeItem)
      .then(item => {
        if (active) onSelect(item)
      })
      .catch(error => {
        if (!active) return
        clearSharedItemId()
        onError(error?.message || '공유된 게시글을 불러오지 못했습니다.')
      })

    return () => {
      active = false
    }
  }, [accessToken, apiEnabled, enabled, items, onError, onSelect])
}
