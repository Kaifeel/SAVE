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

it('keeps a websocket message when an older message snapshot arrives later', async () => {
  let resolveMessages
  let roomMessageHandler
  const socketFactory = vi.fn(options => ({
    connect: () => options.onStateChange('connected'),
    disconnect: vi.fn(),
    subscribe: vi.fn((_roomId, handler) => {
      roomMessageHandler = handler
      return vi.fn()
    }),
    subscribeToChatList: vi.fn(() => vi.fn()),
    subscribeToNotifications: vi.fn(() => vi.fn()),
  }))
  const api = {
    getChatMessages: vi.fn().mockReturnValue(new Promise(resolve => {
      resolveMessages = resolve
    })),
    markChatRoomRead: vi.fn().mockResolvedValue({ read_count: 1 }),
    sendChatMessage: vi.fn(),
  }
  const { result } = renderHook(() => useChatRooms({
    api,
    accessToken: 'jwt',
    currentUserId: 1,
    realtime: true,
    socketFactory,
  }))

  act(() => {
    result.current.selectRoom({
      roomId: 9,
      messages: [{
        id: 4,
        sender: 'other',
        text: '더 이전 메시지',
        time: '2026-08-21T14:59:00',
      }],
    })
  })
  await waitFor(() => expect(roomMessageHandler).toBeTypeOf('function'))
  act(() => {
    roomMessageHandler({
      id: 6,
      sender_id: 2,
      message: '실시간 메시지',
      created_at: '2026-08-21T15:01:00',
    })
  })
  await act(async () => {
    resolveMessages([{
      id: 5,
      sender_id: 2,
      message: '이전 메시지',
      created_at: '2026-08-21T15:00:00',
    }])
  })

  expect(result.current.activeRoom.messages).toEqual([
    expect.objectContaining({ id: 4, text: '더 이전 메시지' }),
    expect.objectContaining({ id: 5, text: '이전 메시지' }),
    expect.objectContaining({ id: 6, text: '실시간 메시지' }),
  ])
})

it('resynchronizes the active room and notifies consumers after reconnecting', async () => {
  let changeSocketState
  const onReconnect = vi.fn()
  const socketFactory = vi.fn(options => {
    changeSocketState = options.onStateChange
    return {
      connect: () => options.onStateChange('connected'),
      disconnect: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      subscribeToChatList: vi.fn(() => vi.fn()),
      subscribeToNotifications: vi.fn(() => vi.fn()),
    }
  })
  const api = {
    getChatMessages: vi.fn().mockResolvedValue([]),
    markChatRoomRead: vi.fn().mockResolvedValue({ read_count: 0 }),
    sendChatMessage: vi.fn(),
  }
  const { result } = renderHook(() => useChatRooms({
    api,
    accessToken: 'jwt',
    currentUserId: 1,
    realtime: true,
    socketFactory,
    onReconnect,
  }))

  await act(() => result.current.selectRoom({ roomId: 9, messages: [] }))
  expect(api.getChatMessages).toHaveBeenCalledTimes(1)
  act(() => changeSocketState('disconnected'))
  act(() => changeSocketState('connected'))

  await waitFor(() => expect(onReconnect).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(api.getChatMessages).toHaveBeenCalledTimes(2))
})

it('ignores state changes from a socket replaced after token rotation', async () => {
  const sockets = []
  const socketFactory = vi.fn(options => {
    const socket = {
      options,
      connect: () => options.onStateChange('connected'),
      disconnect: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      subscribeToChatList: vi.fn(() => vi.fn()),
      subscribeToNotifications: vi.fn(() => vi.fn()),
    }
    sockets.push(socket)
    return socket
  })
  const api = {
    getChatMessages: vi.fn().mockResolvedValue([]),
    markChatRoomRead: vi.fn().mockResolvedValue({ read_count: 0 }),
    sendChatMessage: vi.fn(),
  }
  const { result, rerender } = renderHook(
    ({ accessToken }) => useChatRooms({
      api,
      accessToken,
      currentUserId: 1,
      realtime: true,
      socketFactory,
    }),
    { initialProps: { accessToken: 'old-jwt' } },
  )
  await waitFor(() => expect(result.current.socketState).toBe('connected'))

  rerender({ accessToken: 'new-jwt' })
  await waitFor(() => expect(sockets).toHaveLength(2))
  await waitFor(() => expect(result.current.socketState).toBe('connected'))
  act(() => sockets[0].options.onStateChange('disconnected'))

  expect(result.current.socketState).toBe('connected')
})
