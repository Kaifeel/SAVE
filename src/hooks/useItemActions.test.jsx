import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOrGetChatRoom } from '../api/chats.js'
import { addWishlist, removeWishlist } from '../api/wishlist.js'
import { useItemActions } from './useItemActions.js'

vi.mock('../api/chats.js', () => ({ createOrGetChatRoom: vi.fn() }))
vi.mock('../api/wishlist.js', () => ({
  addWishlist: vi.fn(),
  removeWishlist: vi.fn(),
}))

function setup(overrides = {}) {
  const selectedItem = {
    id: 7,
    title: '우산',
    owner: '판매자 컴퓨터공학과',
    wishlisted: false,
    wishlistCount: 2,
  }
  const dependencies = {
    accessToken: 'jwt',
    apiEnabled: true,
    selectedItem,
    setSelectedItem: vi.fn(),
    setItems: vi.fn(),
    itemData: { remove: vi.fn().mockResolvedValue(undefined) },
    chatData: { selectRoom: vi.fn().mockResolvedValue(undefined) },
    chats: [],
    setChats: vi.fn(),
    setActiveChatRoom: vi.fn(),
    setActiveTab: vi.fn(),
    setRentalRequest: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn() },
    ...overrides,
  }
  return {
    ...renderHook(() => useItemActions(dependencies)),
    dependencies,
  }
}

describe('useItemActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addWishlist.mockResolvedValue(null)
    removeWishlist.mockResolvedValue(null)
  })

  it('rolls an optimistic wishlist change back after API failure', async () => {
    addWishlist.mockRejectedValue(new Error('wishlist failed'))
    const { result, dependencies } = setup()

    await act(() => result.current.toggleWishlist(dependencies.selectedItem))

    expect(dependencies.setSelectedItem).toHaveBeenNthCalledWith(1, {
      ...dependencies.selectedItem,
      wishlisted: true,
      wishlistCount: 3,
    })
    expect(dependencies.setSelectedItem).toHaveBeenLastCalledWith(dependencies.selectedItem)
    expect(dependencies.toast.error).toHaveBeenCalledWith('wishlist failed')
  })

  it('creates and selects one API room before navigating to chat', async () => {
    createOrGetChatRoom.mockResolvedValue({
      chat_room_id: 31,
      item_id: 7,
      item_title: '우산',
      opponent_name: '판매자',
    })
    const { result, dependencies } = setup()

    await act(() => result.current.openChat())

    expect(createOrGetChatRoom).toHaveBeenCalledTimes(1)
    expect(createOrGetChatRoom).toHaveBeenCalledWith(7, 'jwt')
    expect(dependencies.chatData.selectRoom).toHaveBeenCalledTimes(1)
    expect(dependencies.chatData.selectRoom).toHaveBeenCalledWith(
      expect.objectContaining({ id: 31, itemId: 7 }),
    )
    expect(dependencies.setActiveTab).toHaveBeenCalledWith('chat')
  })

  it('deletes an item and closes its detail only after success', async () => {
    const { result, dependencies } = setup()

    await act(() => result.current.deleteItem(7))

    expect(dependencies.itemData.remove).toHaveBeenCalledWith(7)
    expect(dependencies.setSelectedItem).toHaveBeenCalledWith(null)
    expect(dependencies.toast.success).toHaveBeenCalledWith('물품이 삭제되었습니다.')
  })

  it('keeps item detail open when deletion fails', async () => {
    const itemData = { remove: vi.fn().mockRejectedValue(new Error('delete failed')) }
    const { result, dependencies } = setup({ itemData })

    await act(() => result.current.deleteItem(7))

    expect(dependencies.setSelectedItem).not.toHaveBeenCalled()
    expect(dependencies.toast.error).toHaveBeenCalledWith('delete failed')
  })

  it('prepares a rental with the normalized API room id', async () => {
    createOrGetChatRoom.mockResolvedValue({ chat_room_id: 44, item_id: 7 })
    const { result, dependencies } = setup()

    await act(() => result.current.prepareRental())

    expect(createOrGetChatRoom).toHaveBeenCalledWith(7, 'jwt', { enabled: true })
    expect(dependencies.setRentalRequest).toHaveBeenCalledWith({
      item: dependencies.selectedItem,
      chatRoomId: 44,
    })
    expect(dependencies.setSelectedItem).toHaveBeenCalledWith(null)
  })
})
