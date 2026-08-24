import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildItemShareUrl,
  clearSharedItemId,
  getSharedItemId,
  shareItem,
} from './itemShare.js'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('itemShare', () => {
  it('builds and reads an exact item link', () => {
    window.history.replaceState(null, '', '/search?board=lend#result')

    const sharedUrl = buildItemShareUrl(17)

    expect(sharedUrl).toBe('http://localhost:3000/search?board=lend&item=17')
    window.history.replaceState(null, '', sharedUrl)
    expect(getSharedItemId()).toBe(17)
  })

  it('uses the native share dialog when available', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined)

    await expect(shareItem({ id: 7, title: '우산' }, { share: nativeShare }))
      .resolves.toBe('shared')
    expect(nativeShare).toHaveBeenCalledWith(expect.objectContaining({
      title: '우산',
      url: expect.stringContaining('item=7'),
    }))
  })

  it('copies the link when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)

    await expect(shareItem({ id: 7, title: '우산' }, { clipboard: { writeText } }))
      .resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('item=7'))
  })

  it('removes only the shared item query parameter', () => {
    window.history.replaceState(null, '', '/?board=lend&item=7')

    clearSharedItemId()

    expect(window.location.href).toBe('http://localhost:3000/?board=lend')
  })
})
