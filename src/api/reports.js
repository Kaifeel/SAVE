import { apiFetch } from './client'

export function normalizeAdminReport(report) {
  return {
    id: report.id,
    reporterId: report.reporter_id ?? report.reporterId,
    reporterName: report.reporter_name ?? report.reporterName,
    reportedUserId: report.reported_user_id ?? report.reportedUserId,
    reportedUserName: report.reported_user_name ?? report.reportedUserName,
    itemId: report.item_id ?? report.itemId,
    itemTitle: report.item_title ?? report.itemTitle,
    chatRoomId: report.chat_room_id ?? report.chatRoomId,
    reason: report.reason || '',
    status: report.status || 'PENDING',
    createdAt: report.created_at ?? report.createdAt,
    handledAt: report.handled_at ?? report.handledAt,
  }
}

export function createReport(data, accessToken) {
  return apiFetch('/reports', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(data),
  })
}

export function getAdminReports(accessToken) {
  return apiFetch('/admin/reports', {
    method: 'GET',
    accessToken,
  })
}

export function getAdminReportDetail(reportId, accessToken) {
  return apiFetch(`/admin/reports/${reportId}`, {
    method: 'GET',
    accessToken,
  })
}

export function updateAdminReportStatus(reportId, status, accessToken) {
  return apiFetch(`/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ status }),
  })
}

export function deleteAdminItem(itemId, accessToken) {
  return apiFetch(`/admin/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  })
}

export function sanctionAdminUser(userId, data, accessToken) {
  return apiFetch(`/admin/users/${userId}/sanction`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(data),
  })
}
