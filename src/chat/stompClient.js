import { Client } from '@stomp/stompjs'

export function createChatSocket({
  url,
  accessToken,
  onStateChange = () => {},
  onProtocolError = () => {},
  clientFactory = options => new Client(options),
}) {
  const seenMessageIds = new Set()
  const seenMessageIdQueue = []
  const subscriptions = new Map()
  const chatListSubscriptionKey = 'chat-list'
  const notificationSubscriptionKey = 'notifications'
  let reconnectAttempt = 0

  function parseFrame(frame, handler) {
    let body
    try {
      body = JSON.parse(frame.body)
    } catch (error) {
      onProtocolError(error, frame)
      return
    }
    handler(body)
  }

  function rememberMessageId(id) {
    if (id == null) return true
    if (seenMessageIds.has(id)) return false
    seenMessageIds.add(id)
    seenMessageIdQueue.push(id)
    if (seenMessageIdQueue.length > 500) {
      seenMessageIds.delete(seenMessageIdQueue.shift())
    }
    return true
  }

  const client = clientFactory({
    brokerURL: url,
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    reconnectDelay: 1000,
    beforeConnect: () => {
      client.reconnectDelay = Math.min(1000 * (2 ** reconnectAttempt), 30000)
      reconnectAttempt += 1
      onStateChange('connecting')
    },
    onConnect: () => {
      reconnectAttempt = 0
      onStateChange('connected')
    },
    onStompError: () => onStateChange('error'),
    onWebSocketClose: () => onStateChange('disconnected'),
  })

  return {
    connect() {
      client.activate()
    },
    subscribe(roomId, handler) {
      subscriptions.get(roomId)?.unsubscribe()
      const subscription = client.subscribe(`/topic/chats/rooms/${roomId}`, frame => {
        parseFrame(frame, message => {
          if (!rememberMessageId(message.id)) return
          handler(message)
        })
      })
      subscriptions.set(roomId, subscription)
      return () => {
        subscription.unsubscribe()
        subscriptions.delete(roomId)
      }
    },
    subscribeToChatList(handler) {
      subscriptions.get(chatListSubscriptionKey)?.unsubscribe()
      const subscription = client.subscribe('/user/queue/chat-list', frame => {
        parseFrame(frame, handler)
      })
      subscriptions.set(chatListSubscriptionKey, subscription)
      return () => {
        subscription.unsubscribe()
        subscriptions.delete(chatListSubscriptionKey)
      }
    },
    subscribeToNotifications(handler) {
      subscriptions.get(notificationSubscriptionKey)?.unsubscribe()
      const subscription = client.subscribe('/user/queue/notifications', frame => {
        parseFrame(frame, handler)
      })
      subscriptions.set(notificationSubscriptionKey, subscription)
      return () => {
        subscription.unsubscribe()
        subscriptions.delete(notificationSubscriptionKey)
      }
    },
    async disconnect() {
      subscriptions.forEach(subscription => subscription.unsubscribe())
      subscriptions.clear()
      await client.deactivate()
    },
  }
}
