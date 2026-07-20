import { apiFetch } from './client'

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
