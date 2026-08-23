import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getNotifications,
  markAllNotificationsRead,
  normalizeNotification,
} from '../api/notifications.js'

const WORKFLOW_NOTIFICATION_TYPES = new Set([
  'RENTAL_REQUESTED',
  'RENTAL_APPROVED',
  'RENTAL_REJECTED',
  'REVIEW_PUBLISHED',
])

function notificationKey(notification) {
  return String(notification.id)
}

export function useAppNotifications({
  accessToken,
  enabled,
  initialNotifications = [],
  reloadItems,
  reloadRentals,
  reloadMyPage,
  toast,
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const [workflowRefreshVersion, setWorkflowRefreshVersion] = useState(0)
  const seenIds = useRef(new Set(initialNotifications.map(notificationKey)))

  useEffect(() => {
    if (!enabled || !accessToken) return undefined

    let active = true
    getNotifications(accessToken)
      .then(response => {
        if (!active) return
        setNotifications(current => {
          const currentIds = new Set(current.map(notificationKey))
          const persisted = response.filter(entry => !currentIds.has(notificationKey(entry)))
          const merged = [...current, ...persisted]
          seenIds.current = new Set(merged.map(notificationKey))
          return merged
        })
      })
      .catch(error => {
        if (active) toast.error(error.message || '알림 목록을 불러오지 못했습니다.')
      })

    return () => {
      active = false
    }
  }, [accessToken, enabled, toast])

  const receive = useCallback(response => {
    const incoming = normalizeNotification(response)
    const key = notificationKey(incoming)
    if (seenIds.current.has(key)) return

    seenIds.current.add(key)
    setNotifications(current => [incoming, ...current])
    if (WORKFLOW_NOTIFICATION_TYPES.has(incoming.type)) {
      setWorkflowRefreshVersion(value => value + 1)
      Promise.allSettled([
        reloadRentals?.(),
        reloadMyPage?.(),
        reloadItems?.(),
      ])
    }
  }, [reloadItems, reloadMyPage, reloadRentals])

  const markAllRead = useCallback(async () => {
    try {
      if (enabled) await markAllNotificationsRead(accessToken)
      setNotifications(current => current.map(entry => ({ ...entry, read: true })))
    } catch (error) {
      toast.error(error.message || '알림 읽음 처리에 실패했습니다.')
    }
  }, [accessToken, enabled, toast])

  const clear = useCallback(() => {
    seenIds.current.clear()
    setNotifications([])
    setIsOpen(false)
  }, [])

  return {
    notifications,
    isOpen,
    setIsOpen,
    workflowRefreshVersion,
    receive,
    markAllRead,
    clear,
  }
}
