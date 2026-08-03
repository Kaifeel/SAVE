import { expect, it, vi } from 'vitest'
import { createChatSocket } from './stompClient'

function fakeClient() {
  const subscriptions = new Map()
  return {
    activate: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
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

it('publishes the backend message contract', () => {
  const client = fakeClient()
  const socket = createChatSocket({
    url: 'ws://localhost:8080/ws-chat',
    accessToken: 'jwt',
    clientFactory: options => Object.assign(client, options),
  })
  socket.connect()
  socket.publish(3, '안녕하세요')

  expect(client.publish).toHaveBeenCalledWith({
    destination: '/app/chats/rooms/3/messages',
    body: JSON.stringify({ message: '안녕하세요' }),
  })
})
