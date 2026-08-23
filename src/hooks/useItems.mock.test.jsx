import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useItems } from './useItems'

it('removes a mock item locally without calling the item API', async () => {
  const api = {
    getItems: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    updateItemStatus: vi.fn(),
    deleteItem: vi.fn().mockResolvedValue(null),
  }
  const { result } = renderHook(() => useItems({
    universityId: 1,
    accessToken: null,
    enabled: false,
    initialItems: [{ id: 7, title: '우산' }],
    api,
  }))

  await act(() => result.current.remove(7))

  expect(result.current.items).toEqual([])
  expect(api.deleteItem).not.toHaveBeenCalled()
})
