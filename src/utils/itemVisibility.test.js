import { expect, it } from 'vitest'
import { availableItems } from './itemVisibility.js'

it('keeps only items that can currently be rented on the home screen', () => {
  expect(availableItems([
    { id: 1, status: 'available' },
    { id: 2, status: 'request_pending' },
    { id: 3, status: 'reserved' },
    { id: 4, status: 'rented' },
    { id: 5 },
  ])).toEqual([{ id: 1, status: 'available' }])
})
