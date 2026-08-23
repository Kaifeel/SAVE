import { createOrGetChatRoom } from '../api/chats.js'
import { normalizeChatRoom } from '../api/normalizers.js'
import { addWishlist, removeWishlist } from '../api/wishlist.js'

export function useItemActions({
  accessToken,
  apiEnabled,
  selectedItem,
  setSelectedItem,
  setItems,
  itemData,
  chatData,
  chats,
  setChats,
  setActiveChatRoom,
  setActiveTab,
  setRentalRequest,
  toast,
}) {
  const deleteItem = async itemId => {
    try {
      await itemData.remove(itemId)
      setSelectedItem(null)
      toast.success('물품이 삭제되었습니다.')
    } catch (error) {
      toast.error(error.message || '물품을 삭제하지 못했습니다.')
    }
  }

  const prepareRental = async () => {
    try {
      const room = normalizeChatRoom(
        await createOrGetChatRoom(selectedItem.id, accessToken, { enabled: apiEnabled }),
      )
      setRentalRequest({ item: selectedItem, chatRoomId: room.roomId || room.id })
      setSelectedItem(null)
    } catch (error) {
      toast.error(error.message || '대여 요청을 준비하지 못했습니다.')
    }
  }

  const toggleWishlist = async item => {
    const previous = item
    const optimistic = {
      ...item,
      wishlisted: !item.wishlisted,
      wishlistCount: Math.max(
        0,
        (item.wishlistCount || 0) + (item.wishlisted ? -1 : 1),
      ),
    }
    setSelectedItem(optimistic)
    try {
      if (item.wishlisted) {
        await removeWishlist(item.id, accessToken, { enabled: apiEnabled })
      } else {
        await addWishlist(item.id, accessToken, { enabled: apiEnabled })
      }
      setItems(current => current.map(entry => entry.id === item.id ? optimistic : entry))
    } catch (error) {
      setSelectedItem(previous)
      toast.error(error.message || '찜 처리에 실패했습니다.')
    }
  }

  const openChat = async () => {
    if (apiEnabled && selectedItem.id) {
      try {
        const roomResponse = await createOrGetChatRoom(selectedItem.id, accessToken)
        const apiRoom = normalizeChatRoom(roomResponse)

        setChats(current => {
          const exists = current.some(room => room.id === apiRoom.id)
          return exists
            ? current.map(room => room.id === apiRoom.id ? apiRoom : room)
            : [apiRoom, ...current]
        })
        await chatData.selectRoom(apiRoom)
        setActiveTab('chat')
        setSelectedItem(null)
        return
      } catch (error) {
        toast.error(error.message || '채팅방을 만들지 못했습니다.')
        return
      }
    }

    const ownerName = selectedItem.owner.split(' ')[0]
    const existingChat = chats.find(chat => chat.sender === ownerName)
    if (existingChat) {
      setActiveChatRoom(existingChat)
    } else {
      const newRoom = {
        id: Date.now(),
        sender: ownerName,
        itemTitle: selectedItem.title,
        lastMessage: '대여 문의드립니다!',
        time: '방금 전',
        unread: false,
        unreadCount: 0,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
        messages: [
          {
            id: 1,
            sender: 'me',
            text: `안녕하세요! [${selectedItem.title}] 대여 가능할까요?`,
            time: '방금 전',
          },
        ],
      }
      setChats(current => [newRoom, ...current])
      setActiveChatRoom(newRoom)
    }
    setActiveTab('chat')
    setSelectedItem(null)
  }

  return { deleteItem, prepareRental, toggleWishlist, openChat }
}
