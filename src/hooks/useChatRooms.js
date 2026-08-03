import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getChatMessages,
  markChatRoomRead,
  sendChatMessage,
} from '../api/chats'
import { normalizeChatMessage, normalizeMessagesResponse } from '../api/normalizers'
import { createChatSocket } from '../chat/stompClient'

const defaultApi = {
  getChatMessages,
  markChatRoomRead,
  sendChatMessage,
}

function defaultSocketUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
  return `${apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')}/ws-chat`
}

export function useChatRooms({
  api = defaultApi,
  accessToken,
  currentUserId,
  realtime = false,
  socketFactory = createChatSocket,
  onChatListUpdate,
  onNotification,
  onRoomRead,
}) {
  const [activeRoom, setActiveRoom] = useState(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageError, setMessageError] = useState(null)
  const [socketState, setSocketState] = useState('disconnected')
  const socketRef = useRef(null)
  const activeRoomRef = useRef(null)

  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  useEffect(() => {
    if (!realtime || !accessToken) return undefined
    const socket = socketFactory({
      url: defaultSocketUrl(),
      accessToken,
      onStateChange: setSocketState,
    })
    socketRef.current = socket
    socket.connect()
    return () => {
      socketRef.current = null
      socket.disconnect()
    }
  }, [accessToken, realtime, socketFactory])

  useEffect(() => {
    if (socketState !== 'connected'
        || !socketRef.current
        || typeof socketRef.current.subscribeToChatList !== 'function') return undefined

    return socketRef.current.subscribeToChatList(response => {
      const activeRoomId = activeRoomRef.current?.roomId || activeRoomRef.current?.id || null
      onChatListUpdate?.(response, activeRoomId)
    })
  }, [onChatListUpdate, socketState])

  useEffect(() => {
    if (socketState !== 'connected'
        || !socketRef.current
        || typeof socketRef.current.subscribeToNotifications !== 'function') return undefined

    return socketRef.current.subscribeToNotifications(response => {
      onNotification?.(response)
    })
  }, [onNotification, socketState])

  useEffect(() => {
    const roomId = activeRoom?.roomId || activeRoom?.id
    if (!roomId || socketState !== 'connected' || !socketRef.current) return undefined
    return socketRef.current.subscribe(roomId, response => {
      const incoming = normalizeChatMessage(response, currentUserId)
      setActiveRoom(current => {
        if (!current || current.messages?.some(message => message.id === incoming.id)) return current
        return { ...current, messages: [...(current.messages || []), incoming] }
      })
      if (incoming.sender !== 'me') {
        api.markChatRoomRead(roomId, accessToken).catch(() => {})
      }
    })
  }, [accessToken, activeRoom?.id, activeRoom?.roomId, api, currentUserId, socketState])

  const selectRoom = useCallback(async room => {
    const roomId = room.roomId || room.id
    setActiveRoom({ ...room, roomId })
    setLoadingMessages(true)
    setMessageError(null)
    try {
      const response = await api.getChatMessages(roomId, accessToken, { size: 50 })
      setActiveRoom(current => current?.roomId === roomId
        ? { ...current, messages: normalizeMessagesResponse(response, currentUserId), unreadCount: 0 }
        : current)
      await api.markChatRoomRead(roomId, accessToken)
      onRoomRead?.(roomId)
    } catch (error) {
      setMessageError(error)
    } finally {
      setLoadingMessages(false)
    }
  }, [accessToken, api, currentUserId, onRoomRead])

  const deliver = useCallback(async optimistic => {
    try {
      const response = await api.sendChatMessage(
        activeRoom.roomId || activeRoom.id,
        optimistic.text,
        accessToken,
      )
      const saved = normalizeChatMessage(response, currentUserId)
      setActiveRoom(current => {
        const replaced = (current.messages || []).map(message =>
          message.clientId === optimistic.clientId ? saved : message)
        const seenIds = new Set()
        const deduplicated = replaced.filter(message => {
          if (message.id == null) return true

          const messageId = String(message.id)
          if (seenIds.has(messageId)) return false

          seenIds.add(messageId)
          return true
        })

        return { ...current, messages: deduplicated }
      })
    } catch {
      setActiveRoom(current => ({
        ...current,
        messages: current.messages.map(message =>
          message.clientId === optimistic.clientId
            ? { ...message, deliveryStatus: 'failed' }
            : message),
      }))
    }
  }, [accessToken, activeRoom, api, currentUserId])

  const send = useCallback(async text => {
    if (!activeRoom || !text.trim()) return
    const optimistic = {
      id: `pending-${Date.now()}`,
      clientId: `client-${Date.now()}-${Math.random()}`,
      sender: 'me',
      text: text.trim(),
      time: '방금 전',
      deliveryStatus: 'sending',
    }
    setActiveRoom(current => ({
      ...current,
      messages: [...(current.messages || []), optimistic],
    }))
    await deliver(optimistic)
  }, [activeRoom, deliver])

  const retry = useCallback(async clientId => {
    const message = activeRoom?.messages.find(entry => entry.clientId === clientId)
    if (!message) return
    setActiveRoom(current => ({
      ...current,
      messages: current.messages.map(entry =>
        entry.clientId === clientId ? { ...entry, deliveryStatus: 'sending' } : entry),
    }))
    await deliver(message)
  }, [activeRoom, deliver])

  return {
    activeRoom,
    setActiveRoom,
    selectRoom,
    send,
    retry,
    loadingMessages,
    messageError,
    socketState,
  }
}
