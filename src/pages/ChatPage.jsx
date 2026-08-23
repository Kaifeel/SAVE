import { ArrowLeft, Camera } from 'lucide-react'
import { findLinkedItem, itemStatusMeta } from '../chat/presentation.js'
import ChatComposer from '../components/chat/ChatComposer.jsx'
import ChatMessageTimeline from '../components/chat/ChatMessageTimeline.jsx'
import ChatRoomList from '../components/chat/ChatRoomList.jsx'

export default function ChatPage({
  activeChatRoom,
  items,
  setActiveChatRoom,
  selectChatRoom = setActiveChatRoom,
  setSelectedItem,
  chatInput,
  setChatInput,
  handleSendMessage,
  chats,
  loadingMessages,
  loadingOlder,
  hasOlder,
  loadOlder,
  messageError,
  retryMessage,
  socketState,
}) {
  if (!activeChatRoom) {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-200">
        <ChatRoomList chats={chats} items={items} selectChatRoom={selectChatRoom} />
      </div>
    )
  }

  const linkedItem = findLinkedItem(items, activeChatRoom)
  const ActiveItemIcon = linkedItem?.imageIcon || Camera
  const priceLabel = linkedItem
    ? `${linkedItem.price.toLocaleString()}원/${linkedItem.priceType}`
    : '물품 정보 없음'
  const [statusLabel, statusClassName] = itemStatusMeta(linkedItem)

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-200">
      <div className="flex-1 flex flex-col h-full bg-slate-50">
        <div className="bg-white px-4 py-3 border-b border-slate-100">
          <div className="flex items-center mb-2">
            <button onClick={() => setActiveChatRoom(null)} className="p-1.5 mr-2 hover:bg-slate-100 rounded-full text-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h4 className="font-extrabold text-slate-800 text-sm truncate flex-1">{activeChatRoom.sender}</h4>
          </div>
          <div
            onClick={() => linkedItem && setSelectedItem(linkedItem)}
            className={`rounded-2xl border border-slate-100 bg-white shadow-sm px-3 py-2.5 flex items-center gap-3 transition-all ${
              linkedItem ? 'cursor-pointer hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 active:scale-[0.99]' : ''
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${linkedItem?.iconColor || 'text-indigo-500 bg-indigo-50'}`}>
              <ActiveItemIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-slate-800 text-xs truncate">{activeChatRoom.itemTitle}</div>
              <div className="text-[11px] font-extrabold text-indigo-600 mt-0.5 truncate">
                {priceLabel}
                <span className="text-slate-300 mx-1">·</span>
                {linkedItem?.location || '위치 정보 없음'}
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <ChatMessageTimeline
          room={activeChatRoom}
          linkedItem={linkedItem}
          ItemIcon={ActiveItemIcon}
          loadingMessages={loadingMessages}
          loadingOlder={loadingOlder}
          hasOlder={hasOlder}
          loadOlder={loadOlder}
          messageError={messageError}
          retryMessage={retryMessage}
          socketState={socketState}
        />
        <ChatComposer value={chatInput} onChange={setChatInput} onSend={handleSendMessage} />
      </div>
    </div>
  )
}
