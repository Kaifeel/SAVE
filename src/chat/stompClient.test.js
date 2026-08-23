import { expect, it, vi } from 'vitest'
import { createChatSocket } from './stompClient'

function fakeClient() {
  const subscriptions = new Map()
  return {
    activate: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((destination, handler) => {
      subscriptions.set(destination, handler)
      return { unsubscribe: vi.fn() }
    }),
    emit(roomId, body) {
      subscriptions.get(`/topic/chats/rooms/${roomId}`)?.({
        body: JSON.stringify(body),
      })
    },
    emitChatList(body) {
      subscriptions.get('/user/queue/chat-list')?.({
        body: JSON.stringify(body),
      })
    },
    emitNotification(body) {
      subscriptions.get('/user/queue/notifications')?.({
        body: JSON.stringify(body),
      })
    },
    emitRaw(destination, body) {
      subscriptions.get(destination)?.({ body })
    },
  }
}

it('authenticates STOMP and deduplicates subscribed messages by id', () => {
  const client = fakeClient()
  const socket = createChatSocket({
    url: 'ws://localhost:8080/ws-chat',
    accessToken: 'jwt',
    clientFactory: options => Object.assign(client, options),
  })
  socket.connect()
  expect(client.connectHeaders.Authorization).toBe('Bearer jwt')

  const handler = vi.fn()
  socket.subscribe(3, handler)
  client.emit(3, { id: 8, message: '한 번' })
  client.emit(3, { id: 8, message: '한 번' })

  expect(handler).toHaveBeenCalledTimes(1)
})

it('subscribes to personal chat-list updates', () => {
  const client = fakeClient()
  const socket = createChatSocket({
    url: 'ws://localhost:8080/ws-chat',
    accessToken: 'jwt',
    clientFactory: options => Object.assign(client, options),
  })
  const handler = vi.fn()

  socket.subscribeToChatList(handler)
  client.emitChatList({ chat_room_id: 3, last_message: '새 메시지' })

  expect(client.subscribe).toHaveBeenCalledWith('/user/queue/chat-list', expect.any(Function))
  expect(handler).toHaveBeenCalledWith({ chat_room_id: 3, last_message: '새 메시지' })
})

it('subscribes to personal rental notifications', () => {
  const client = fakeClient()
  const socket = createChatSocket({
    url: 'ws://localhost:8080/ws-chat',
    accessToken: 'jwt',
    clientFactory: options => Object.assign(client, options),
  })
  const handler = vi.fn()

  socket.subscribeToNotifications(handler)
  client.emitNotification({ id: 3, type: 'RENTAL_REQUESTED' })

  expect(client.subscribe).toHaveBeenCalledWith('/user/queue/notifications', expect.any(Function))
  expect(handler).toHaveBeenCalledWith({ id: 3, type: 'RENTAL_REQUESTED' })
})

it.each([
  ['room', (socket, handler) => socket.subscribe(3, handler), '/topic/chats/rooms/3'],
  ['chat list', (socket, handler) => socket.subscribeToChatList(handler), '/user/queue/chat-list'],
  ['notification', (socket, handler) => socket.subscribeToNotifications(handler), '/user/queue/notifications'],
])('isolates malformed JSON from the %s subscription', (_, subscribe, destination) => {
  const client = fakeClient()
  const onProtocolError = vi.fn()
  const socket = createChatSocket({
    url: 'ws://localhost:8080/ws-chat',
    accessToken: 'jwt',
    onProtocolError,
    clientFactory: options => Object.assign(client, options),
  })
  const handler = vi.fn()
  subscribe(socket, handler)

  expect(() => client.emitRaw(destination, '{invalid-json')).not.toThrow()

  expect(onProtocolError).toHaveBeenCalledWith(expect.any(SyntaxError), expect.any(Object))
  expect(handler).not.toHaveBeenCalled()
})

it('evicts old message ids from the deduplication window', () => {
  const client = fakeClient()
  const socket = createChatSocket({
    url: 'ws://localhost:8080/ws-chat',
    accessToken: 'jwt',
    clientFactory: options => Object.assign(client, options),
  })
  const handler = vi.fn()
  socket.subscribe(3, handler)

  for (let id = 1; id <= 501; id += 1) {
    client.emit(3, { id, message: `message-${id}` })
  }
  client.emit(3, { id: 1, message: 'message-1-again' })

  expect(handler).toHaveBeenCalledTimes(502)
})
