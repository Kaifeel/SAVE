import { useCallback, useState } from 'react'
import {
  getChatMessages,
  markChatRoomRead,
  sendChatMessage,
} from '../api/chats'
import { normalizeChatMessage, normalizeMessagesResponse } from '../api/normalizers'

const defaultApi = {
  getChatMessages,
  markChatRoomRead,
  sendChatMessage,
}

export function useChatRooms({ api = defaultApi, accessToken, currentUserId }) {
  const [activeRoom, setActiveRoom] = useState(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageError, setMessageError] = useState(null)

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
    } catch (error) {
      setMessageError(error)
    } finally {
      setLoadingMessages(false)
    }
  }, [accessToken, api, currentUserId])

  const deliver = useCallback(async optimistic => {
    try {
      const response = await api.sendChatMessage(
        activeRoom.roomId || activeRoom.id,
        optimistic.text,
        accessToken,
      )
      const saved = normalizeChatMessage(response, currentUserId)
      setActiveRoom(current => ({
        ...current,
        messages: current.messages.map(message =>
          message.clientId === optimistic.clientId ? saved : message),
      }))
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
  }
}
