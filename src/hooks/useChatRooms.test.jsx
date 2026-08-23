import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useChatRooms } from './useChatRooms'

it('loads room messages and marks them read when selected', async () => {
  const onRoomRead = vi.fn()
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
    onRoomRead,
  }))

  await act(() => result.current.selectRoom({ roomId: 9, messages: [] }))

  expect(api.getChatMessages).toHaveBeenCalledWith(9, 'jwt', { size: 50 })
  expect(api.markChatRoomRead).toHaveBeenCalledWith(9, 'jwt')
  expect(onRoomRead).toHaveBeenCalledWith(9)
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

it('forwards personal notifications without removing room-read updates', async () => {
  const onNotification = vi.fn()
  const onRoomRead = vi.fn()
  let notificationHandler
  const socketFactory = vi.fn(options => ({
    connect: () => options.onStateChange('connected'),
    disconnect: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    subscribeToChatList: vi.fn(() => vi.fn()),
    subscribeToNotifications: vi.fn(handler => {
      notificationHandler = handler
      return vi.fn()
    }),
  }))
  const api = {
    getChatMessages: vi.fn().mockResolvedValue([]),
    markChatRoomRead: vi.fn().mockResolvedValue({ read_count: 1 }),
    sendChatMessage: vi.fn(),
  }
  const { result } = renderHook(() => useChatRooms({
    api,
    accessToken: 'jwt',
    currentUserId: 1,
    realtime: true,
    socketFactory,
    onNotification,
    onRoomRead,
  }))

  await waitFor(() => expect(notificationHandler).toBeTypeOf('function'))
  act(() => notificationHandler({ id: 8, type: 'RENTAL_REQUESTED' }))
  expect(onNotification).toHaveBeenCalledWith({ id: 8, type: 'RENTAL_REQUESTED' })

  await act(() => result.current.selectRoom({ roomId: 9, messages: [] }))
  expect(onRoomRead).toHaveBeenCalledWith(9)
})

it('ignores a stale room response while the newly selected room is still loading', async () => {
  let resolveFirst
  let resolveSecond
  const firstMessages = new Promise(resolve => { resolveFirst = resolve })
  const secondMessages = new Promise(resolve => { resolveSecond = resolve })
  const api = {
    getChatMessages: vi.fn()
      .mockReturnValueOnce(firstMessages)
      .mockReturnValueOnce(secondMessages),
    markChatRoomRead: vi.fn().mockResolvedValue({ read_count: 1 }),
    sendChatMessage: vi.fn(),
  }
  const { result } = renderHook(() => useChatRooms({
    api,
    accessToken: 'jwt',
    currentUserId: 1,
  }))

  let firstSelection
  let secondSelection
  act(() => {
    firstSelection = result.current.selectRoom({ roomId: 1, messages: [] })
    secondSelection = result.current.selectRoom({ roomId: 2, messages: [] })
  })

  await act(async () => resolveFirst([{ id: 11, sender_id: 2, message: 'old room' }]))
  expect(result.current.activeRoom.roomId).toBe(2)
  expect(result.current.loadingMessages).toBe(true)
  expect(api.markChatRoomRead).not.toHaveBeenCalledWith(1, 'jwt')

  await act(async () => resolveSecond([{ id: 22, sender_id: 2, message: 'current room' }]))
  await act(async () => Promise.all([firstSelection, secondSelection]))

  expect(result.current.loadingMessages).toBe(false)
  expect(result.current.activeRoom.messages[0].text).toBe('current room')
})
