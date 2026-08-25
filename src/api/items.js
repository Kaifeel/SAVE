import { apiFetch } from './client'

function buildItemFormData(data) {
  const formData = new FormData()
  const fields = {
    type: data.type,
    title: data.title,
    rentalFee: data.rental_fee,
    rentalUnit: data.rental_unit,
    pickupLocationId: data.pickup_location_id,
    description: data.description,
    precautions: data.precautions,
  }

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  })

  data.photos.forEach(photo => {
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
    rental_fee: data.rental_fee ?? data.price,
    rental_unit: data.rental_unit ?? data.price_unit ?? data.priceType,
    pickup_location_id: data.pickup_location_id ?? data.pickupLocationId,
    description: data.description,
    precautions: data.precautions ?? '',
    photos: data.photos ?? [],
  }
}

function hasPhotoFiles(data) {
  return data?.photos?.some(photo => photo instanceof File)
}

function withoutPhotos(data) {
  const request = { ...data }
  delete request.photos
  return request
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
    : JSON.stringify(withoutPhotos(apiData))

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
    : JSON.stringify(withoutPhotos(apiData))

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
