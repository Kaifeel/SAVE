import { apiFetch } from './client'

function buildItemFormData(data) {
  const formData = new FormData()
  const { photos = [], ...fields } = data

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })

  photos.forEach(photo => {
    if (photo instanceof File) {
      formData.append('photos', photo)
    }
  })

  return formData
}

function hasPhotoFiles(data) {
  return data?.photos?.some(photo => photo instanceof File)
}

export function getItems(params = {}, accessToken) {
  return apiFetch('/items', {
    method: 'GET',
    params,
    accessToken,
  })
}

export function createItem(data, accessToken) {
  const body = hasPhotoFiles(data)
    ? buildItemFormData(data)
    : JSON.stringify(data)

  return apiFetch('/items', {
    method: 'POST',
    accessToken,
    body,
  })
}

export function getItemDetail(itemId, accessToken) {
  return apiFetch(`/items/${itemId}`, {
    method: 'GET',
    accessToken,
  })
}

export function updateItem(itemId, data, accessToken) {
  const body = hasPhotoFiles(data)
    ? buildItemFormData(data)
    : JSON.stringify(data)

  return apiFetch(`/items/${itemId}`, {
    method: 'PUT',
    accessToken,
    body,
  })
}

export function updateItemStatus(itemId, status, accessToken) {
  return apiFetch(`/items/${itemId}/status`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ status }),
  })
}

export function deleteItem(itemId, accessToken) {
  return apiFetch(`/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  })
}
