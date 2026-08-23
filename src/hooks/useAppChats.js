import { useCallback, useEffect, useState } from 'react'
import { getChatRooms } from '../api/chats.js'
import { mergeChatListUpdate, mergeChatRoomSnapshot } from '../api/normalizers.js'
import { useChatRooms } from './useChatRooms.js'

export function useAppChats({
  accessToken,
  currentUserId,
  apiEnabled,
  enabled,
  realtime,
  initialChats,
  onNotification,
  toast,
}) {
  const [chats, setChats] = useState(initialChats)
  const [chatInput, setChatInput] = useState('')
  const handleChatListUpdate = useCallback((response, activeRoomId) => {
    setChats(current => mergeChatListUpdate(current, response, activeRoomId))
  }, [])
  const handleRoomRead = useCallback(roomId => {
    setChats(current => current.map(room => String(room.id) === String(roomId)
      ? { ...room, unreadCount: 0, unread: false }
      : room))
  }, [])
  const chatData = useChatRooms({
    accessToken,
    currentUserId,
    realtime,
    onChatListUpdate: handleChatListUpdate,
    onRoomRead: handleRoomRead,
    onNotification,
  })

  useEffect(() => {
    if (!enabled || !accessToken) return undefined

    let active = true
    getChatRooms(accessToken)
      .then(response => {
        if (active) setChats(current => mergeChatRoomSnapshot(current, response))
      })
      .catch(error => {
        if (active) toast.error(error.message || '채팅방 목록을 불러오지 못했습니다.')
      })
    return () => {
      active = false
    }
  }, [accessToken, enabled, toast])

  const sendMessage = async () => {
    if (!chatInput.trim() || !chatData.activeRoom) return
    const messageText = chatInput.trim()
    setChatInput('')
    if (apiEnabled) {
      await chatData.send(messageText)
      return
    }
    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text: messageText,
      time: '방금 전',
      deliveryStatus: 'sent',
    }
    chatData.setActiveRoom(current => ({
      ...current,
      messages: [...current.messages, newMessage],
    }))
  }

  const clear = () => {
    setChats([])
    setChatInput('')
    chatData.setActiveRoom(null)
  }

  return {
    ...chatData,
    chats,
    setChats,
    chatInput,
    setChatInput,
    sendMessage,
    clear,
  }
}
