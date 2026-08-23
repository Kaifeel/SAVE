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
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [messageError, setMessageError] = useState(null)
  const [socketState, setSocketState] = useState('disconnected')
  const socketRef = useRef(null)
  const activeRoomRef = useRef(null)
  const roomSelectionRequestRef = useRef(0)

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
    const requestId = roomSelectionRequestRef.current + 1
    roomSelectionRequestRef.current = requestId
    setActiveRoom({ ...room, roomId })
    setLoadingMessages(true)
    setMessageError(null)
    try {
      const response = await api.getChatMessages(roomId, accessToken, { size: 50 })
      if (roomSelectionRequestRef.current !== requestId) return
      const page = normalizeMessagesResponse(response, currentUserId)
      setActiveRoom(current => current?.roomId === roomId
        ? {
          ...current,
          messages: page.messages,
          nextBefore: page.nextBefore,
          hasOlder: page.hasMore,
          unreadCount: 0,
        }
        : current)
      await api.markChatRoomRead(roomId, accessToken)
      onRoomRead?.(roomId)
    } catch (error) {
      if (roomSelectionRequestRef.current === requestId) setMessageError(error)
    } finally {
      if (roomSelectionRequestRef.current === requestId) setLoadingMessages(false)
    }
  }, [accessToken, api, currentUserId, onRoomRead])

  const loadOlder = useCallback(async () => {
    const roomId = activeRoom?.roomId || activeRoom?.id
    const before = activeRoom?.nextBefore
    if (!roomId || before == null || !activeRoom?.hasOlder || loadingOlder) return

    setLoadingOlder(true)
    setMessageError(null)
    try {
      const response = await api.getChatMessages(roomId, accessToken, { size: 50, before })
      const page = normalizeMessagesResponse(response, currentUserId)
      setActiveRoom(current => {
        const currentRoomId = current?.roomId || current?.id
        if (String(currentRoomId) !== String(roomId)) return current

        const existingIds = new Set((current.messages || [])
          .filter(message => message.id != null)
          .map(message => String(message.id)))
        const olderMessages = page.messages.filter(message => {
          if (message.id == null) return true
          const id = String(message.id)
          if (existingIds.has(id)) return false
          existingIds.add(id)
          return true
        })
        return {
          ...current,
          messages: [...olderMessages, ...(current.messages || [])],
          nextBefore: page.nextBefore,
          hasOlder: page.hasMore,
        }
      })
    } catch (error) {
      setMessageError(error)
    } finally {
      setLoadingOlder(false)
    }
  }, [accessToken, activeRoom, api, currentUserId, loadingOlder])

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
    loadingOlder,
    hasOlder: Boolean(activeRoom?.hasOlder),
    loadOlder,
    messageError,
    socketState,
  }
}
