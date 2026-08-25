import { expect, it } from 'vitest'
import { itemPhotoUrl, resolveAssetUrl } from './assetUrl.js'

it('keeps local HTTP uploads same-origin so the web CSP allows them', () => {
  expect(resolveAssetUrl(
    '/uploads/items/photo.png',
    'http://192.168.0.10:8080/api/v1',
  )).toBe('/uploads/items/photo.png')
})

it('resolves uploads against an HTTPS API origin in production', () => {
  expect(resolveAssetUrl(
    '/uploads/items/photo.png',
    'https://api.save.example/api/v1',
  )).toBe('https://api.save.example/uploads/items/photo.png')
})

it('keeps absolute and local development URLs unchanged', () => {
  expect(resolveAssetUrl('https://cdn.example/photo.png', 'http://api.test/api/v1'))
    .toBe('https://cdn.example/photo.png')
  expect(resolveAssetUrl('/uploads/items/photo.png', ''))
    .toBe('/uploads/items/photo.png')
})

it('uses the main image first and falls back to the first item photo', () => {
  expect(itemPhotoUrl({
    mainImageUrl: 'https://cdn.example/main.png',
    photos: ['https://cdn.example/other.png'],
  })).toBe('https://cdn.example/main.png')
  expect(itemPhotoUrl({ photos: ['https://cdn.example/other.png'] }))
    .toBe('https://cdn.example/other.png')
  expect(itemPhotoUrl({ photos: [] })).toBe('')
})
