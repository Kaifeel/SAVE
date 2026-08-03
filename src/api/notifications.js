import { apiFetch } from './client'

function formatNotificationTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
}

export function normalizeNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    rentalId: notification.rental_id ?? notification.rentalId,
    itemId: notification.item_id ?? notification.itemId,
    title: notification.title,
    text: notification.content ?? notification.text,
    read: Boolean(notification.read),
    time: formatNotificationTime(notification.created_at ?? notification.createdAt),
  }
}

export async function getNotifications(accessToken) {
  const response = await apiFetch('/notifications', { method: 'GET', accessToken })
  return (response || []).map(normalizeNotification)
}

export function markNotificationRead(notificationId, accessToken) {
  return apiFetch(`/notifications/${notificationId}/read`, {
    method: 'PATCH', accessToken,
  })
}

export function markAllNotificationsRead(accessToken) {
  return apiFetch('/notifications/read-all', {
    method: 'PATCH', accessToken,
  })
}
