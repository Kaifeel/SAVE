import { Client } from '@stomp/stompjs'

export function createChatSocket({
  url,
  accessToken,
  onStateChange = () => {},
  clientFactory = options => new Client(options),
}) {
  const seenMessageIds = new Set()
  const subscriptions = new Map()
  const chatListSubscriptionKey = 'chat-list'
  let reconnectAttempt = 0

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
        const message = JSON.parse(frame.body)
        if (message.id != null && seenMessageIds.has(message.id)) return
        if (message.id != null) seenMessageIds.add(message.id)
        handler(message)
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
        handler(JSON.parse(frame.body))
      })
      subscriptions.set(chatListSubscriptionKey, subscription)
      return () => {
        subscription.unsubscribe()
        subscriptions.delete(chatListSubscriptionKey)
      }
    },
    publish(roomId, message) {
      client.publish({
        destination: `/app/chats/rooms/${roomId}/messages`,
        body: JSON.stringify({ message }),
      })
    },
    async disconnect() {
      subscriptions.forEach(subscription => subscription.unsubscribe())
      subscriptions.clear()
      await client.deactivate()
    },
  }
}
