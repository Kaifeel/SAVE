import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useChatRooms } from './useChatRooms'

it('loads room messages and marks them read when selected', async () => {
  const api = {
    getChatMessages: vi.fn().mockResolvedValue([
      { id: 5, sender_id: 2, message: '안녕하세요', created_at: '2026-07-29T01:00:00' },
    ]),
    markChatRoomRead: vi.fn().mockResolvedValue({ read_count: 1 }),
    sendChatMessage: vi.fn(),
  }
  const { result } = renderHook(() => useChatRooms({
    api,
    accessToken: 'jwt',
    currentUserId: 1,
  }))

  await act(() => result.current.selectRoom({ roomId: 9, messages: [] }))

  expect(api.getChatMessages).toHaveBeenCalledWith(9, 'jwt', { size: 50 })
  expect(api.markChatRoomRead).toHaveBeenCalledWith(9, 'jwt')
  expect(result.current.activeRoom.messages[0]).toMatchObject({
    id: 5,
    sender: 'other',
    text: '안녕하세요',
  })
})

it('keeps a failed optimistic message available for retry', async () => {
  const api = {
    getChatMessages: vi.fn(),
    markChatRoomRead: vi.fn(),
    sendChatMessage: vi.fn().mockRejectedValueOnce(new Error('offline')),
  }
  const { result } = renderHook(() => useChatRooms({
    api,
    accessToken: 'jwt',
    currentUserId: 1,
  }))

  act(() => result.current.setActiveRoom({ roomId: 9, messages: [] }))
  await act(() => result.current.send('메시지'))

  await waitFor(() => {
    expect(result.current.activeRoom.messages[0].deliveryStatus).toBe('failed')
  })
  expect(result.current.activeRoom.messages[0].text).toBe('메시지')
})
