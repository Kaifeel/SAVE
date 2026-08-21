import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotification,
} from '../api/notifications.js'

export function mergeNotifications(preferred, fallback) {
  const seenIds = new Set()
  return [...preferred, ...fallback]
    .filter(notification => {
      if (seenIds.has(notification.id)) return false
      seenIds.add(notification.id)
      return true
    })
    .map((notification, index) => ({ notification, index }))
    .sort((left, right) => {
      const leftTime = Date.parse(left.notification.createdAt)
      const rightTime = Date.parse(right.notification.createdAt)
      if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) return rightTime - leftTime
      if (!Number.isNaN(leftTime)) return -1
      if (!Number.isNaN(rightTime)) return 1
      return left.index - right.index
    })
    .map(entry => entry.notification)
}

export function useNotifications({
  accessToken,
  enabled,
  initialNotifications = [],
  onWorkflowNotification,
  onError,
} = {}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!accessToken) return []
    setLoading(true)
    try {
      const snapshot = await getNotifications(accessToken)
      setNotifications(current => mergeNotifications(snapshot, current))
      return snapshot
    } catch (error) {
      onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [accessToken, onError])

  useEffect(() => {
    if (!enabled || !accessToken) return
    let active = true
    getNotifications(accessToken)
      .then(snapshot => {
        if (active) setNotifications(current => mergeNotifications(snapshot, current))
      })
      .catch(error => {
        if (active) onError?.(error)
      })
    return () => {
      active = false
    }
  }, [accessToken, enabled, onError])

  const handleRealtime = useCallback(response => {
    const incoming = normalizeNotification(response)
    setNotifications(current => mergeNotifications([incoming], current))
    onWorkflowNotification?.(incoming)
  }, [onWorkflowNotification])

  const markRead = useCallback(async id => {
    const notification = notifications.find(entry => entry.id === id)
    if (!notification || notification.read) return
    if (enabled) await markNotificationRead(id, accessToken)
    setNotifications(current => current.map(entry => (
      entry.id === id ? { ...entry, read: true } : entry
    )))
  }, [accessToken, enabled, notifications])

  const markAllRead = useCallback(async () => {
    if (enabled) await markAllNotificationsRead(accessToken)
    setNotifications(current => current.map(entry => ({ ...entry, read: true })))
  }, [accessToken, enabled])

  const clear = useCallback(() => setNotifications([]), [])
  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications],
  )

  return {
    notifications,
    unreadCount,
    loading,
    handleRealtime,
    reload,
    markRead,
    markAllRead,
    clear,
  }
}
