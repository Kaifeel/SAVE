import { describe, expect, it } from 'vitest'
import { createDemoChats } from './demoChats.js'
import { createDemoNotifications } from './demoNotifications.js'

describe('demo data factories', () => {
  it('returns a fresh chat graph for every app mount', () => {
    const first = createDemoChats()
    const second = createDemoChats()

    first[0].messages.push({ id: 999, text: 'mutation' })

    expect(second[0].messages).not.toContainEqual(
      expect.objectContaining({ id: 999 }),
    )
  })

  it('returns a fresh notification list for every app mount', () => {
    const first = createDemoNotifications()
    const second = createDemoNotifications()

    first[0].read = true

    expect(second[0].read).toBe(false)
  })
})
