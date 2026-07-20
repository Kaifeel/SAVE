import { apiFetch } from './client'

function buildItemFormData(data) {
  const formData = new FormData()
  const { photos = [], ...fields } = data

  if (fields.price_unit !== undefined) {
    fields.priceUnit = fields.price_unit
    delete fields.price_unit
  }
  if (fields.pickup_location !== undefined) {
    fields.pickupLocation = fields.pickup_location
    delete fields.pickup_location
  }

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

function toApiItem(data) {
  return {
    type: data.type,
    title: data.title,
    price: data.price,
    price_unit: data.price_unit ?? data.priceType,
    pickup_location: data.pickup_location ?? data.location,
    university: data.university,
    description: data.description,
    precautions: data.precautions,
    photos: data.photos,
  }
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
  const apiData = toApiItem(data)
  const body = hasPhotoFiles(apiData)
    ? buildItemFormData(apiData)
    : JSON.stringify(apiData)

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
  const apiData = toApiItem(data)
  const body = hasPhotoFiles(apiData)
    ? buildItemFormData(apiData)
    : JSON.stringify(apiData)

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
    body: JSON.stringify({ status: status.toUpperCase() }),
  })
}

export function deleteItem(itemId, accessToken) {
  return apiFetch(`/items/${itemId}`, {
    method: 'DELETE',
    accessToken,
  })
}
