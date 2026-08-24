import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getItemDetail } from '../api/items.js'
import { useSharedItemRoute } from './useSharedItemRoute.js'

vi.mock('../api/items.js', () => ({ getItemDetail: vi.fn() }))

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.clearAllMocks()
})

describe('useSharedItemRoute', () => {
  it('selects an already loaded shared item without another request', async () => {
    const onSelect = vi.fn()
    const item = { id: 7, title: '우산' }
    window.history.replaceState(null, '', '/?item=7')

    renderHook(() => useSharedItemRoute({
      enabled: true,
      apiEnabled: true,
      accessToken: 'token',
      items: [item],
      onSelect,
      onError: vi.fn(),
    }))

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(item))
    expect(getItemDetail).not.toHaveBeenCalled()
  })

  it('loads a shared item that is not in the current list', async () => {
    const onSelect = vi.fn()
    getItemDetail.mockResolvedValue({ id: 9, title: '카메라', status: 'AVAILABLE' })
    window.history.replaceState(null, '', '/?item=9')

    renderHook(() => useSharedItemRoute({
      enabled: true,
      apiEnabled: true,
      accessToken: 'token',
      items: [],
      onSelect,
      onError: vi.fn(),
    }))

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, title: '카메라', status: 'available' }),
    ))
    expect(getItemDetail).toHaveBeenCalledWith(9, 'token')
  })
})
