import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useChatRooms } from './useChatRooms'

it('deduplicates the sender message when WebSocket delivery beats the REST response', async () => {
  let resolveSend
  let receiveSocketMessage
  const savedMessage = {
    id: 42,
    sender_id: 1,
    message: 'hello',
    created_at: '2026-08-02T01:00:00',
  }
  const api = {
    getChatMessages: vi.fn(),
    markChatRoomRead: vi.fn(),
    sendChatMessage: vi.fn(() => new Promise(resolve => {
      resolveSend = resolve
    })),
  }
  const socketFactory = vi.fn(({ onStateChange }) => ({
    connect: () => onStateChange('connected'),
    subscribe: vi.fn((roomId, handler) => {
      receiveSocketMessage = handler
      return vi.fn()
    }),
    disconnect: vi.fn(),
  }))
  const { result } = renderHook(() => useChatRooms({
    api,
    accessToken: 'jwt',
    currentUserId: 1,
    realtime: true,
    socketFactory,
  }))

  act(() => result.current.setActiveRoom({ roomId: 9, messages: [] }))
  await waitFor(() => expect(receiveSocketMessage).toBeTypeOf('function'))

  let sendPromise
  act(() => {
    sendPromise = result.current.send('hello')
  })
  await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledOnce())

  act(() => receiveSocketMessage(savedMessage))
  await act(async () => {
    resolveSend(savedMessage)
    await sendPromise
  })

  expect(result.current.activeRoom.messages).toHaveLength(1)
  expect(result.current.activeRoom.messages[0]).toMatchObject({
    id: 42,
    sender: 'me',
    text: 'hello',
    deliveryStatus: 'sent',
  })
})
