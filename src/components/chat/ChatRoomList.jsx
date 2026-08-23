import { Camera } from 'lucide-react'
import { findLinkedItem, formatChatTime } from '../../chat/presentation.js'

export default function ChatRoomList({ chats, items, selectChatRoom }) {
  return (
    <div className="p-5">
      <h2 className="text-xl font-black text-slate-800 mb-4">채팅 목록</h2>
      <div className="space-y-3">
        {chats.map(chat => {
          const linkedItem = findLinkedItem(items, chat)
          const ChatItemIcon = linkedItem?.imageIcon || Camera
          const unreadCount = chat.unreadCount ?? (chat.unread ? 1 : 0)

          return (
            <button
              type="button"
              key={chat.id}
              onClick={() => selectChatRoom(chat)}
              className="w-full text-left bg-white border border-slate-100 rounded-2xl px-3.5 py-3 flex items-center gap-3 cursor-pointer hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 transition-all"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${linkedItem?.iconColor || 'text-indigo-500 bg-indigo-50'}`}>
                <ChatItemIcon className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-[13px] font-extrabold text-slate-900 truncate">{chat.sender}</div>
                <div className="text-[12px] font-bold text-slate-700 truncate mt-1">{chat.itemTitle}</div>
                <div className="text-[12px] font-semibold text-slate-500 truncate mt-1">{chat.lastMessage}</div>
              </div>
              <div className="w-16 flex-shrink-0 flex flex-col items-center gap-2">
                <div className="text-[10px] font-bold text-slate-400 text-center">
                  {formatChatTime(chat.time)}
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${
                  unreadCount > 0
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {unreadCount}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
