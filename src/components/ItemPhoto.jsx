import { useState } from 'react'
import { itemPhotoUrl, resolveAssetUrl } from '../utils/assetUrl.js'

export default function ItemPhoto({ item, src, fallback, alt = '', className = 'w-full h-full object-cover' }) {
  const photoUrl = src === undefined ? itemPhotoUrl(item) : resolveAssetUrl(src)
  const [failedUrl, setFailedUrl] = useState('')

  if (!photoUrl || failedUrl === photoUrl) return fallback

  return (
    <img
      src={photoUrl}
      alt={alt}
      className={className}
      onError={() => setFailedUrl(photoUrl)}
    />
  )
}
