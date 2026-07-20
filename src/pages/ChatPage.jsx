import { ArrowLeft, Camera, Send } from 'lucide-react'

export default function ChatPage(props) {
  const {
    activeChatRoom,
    items,
    setActiveChatRoom,
    setSelectedItem,
    chatInput,
    setChatInput,
    handleSendMessage,
    chats,
  } = props

  return (
            <div className="h-full flex flex-col animate-in fade-in duration-200">
              {activeChatRoom ? (
                /* Active Chat Room View */
                (() => {
                  const linkedItem = items.find(item => item.title === activeChatRoom.itemTitle)
                  const ActiveItemIcon = linkedItem?.imageIcon || Camera
                  const priceLabel = linkedItem
                    ? `${linkedItem.price.toLocaleString()}원/${linkedItem.priceType}`
                    : '15,000원/일'

                  return (
                    <div className="flex-1 flex flex-col h-full bg-slate-50">
                      {/* Item Header */}
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
                              {linkedItem?.location || '공학관 앞'}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-extrabold">
                            대여 가능
                          </span>
                        </div>
                      </div>

                      {/* Messages Area */}
                      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                        <div className="text-center text-[10px] text-slate-400 bg-slate-200/60 rounded-full px-4 py-1.5 w-max mx-auto mb-2">
                          2026년 5월 23일
                        </div>
                        {activeChatRoom.messages.map(msg => {
                          const isMe = msg.sender === 'me'
                          return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {!isMe && (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${linkedItem?.iconColor || 'text-indigo-500 bg-indigo-50'}`}>
                                  <ActiveItemIcon className="w-4 h-4" />
                                </div>
                              )}
                              <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-5 shadow-sm ${
                                  isMe
                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
                                }`}>
                                  {msg.text}
                                </div>
                                <span className={`text-[9px] mt-1 ${isMe ? 'text-indigo-300' : 'text-slate-400'}`}>
                                  {isMe && <span className="mr-1">✓✓</span>}
                                  {msg.time}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Message Input Bar */}
                      <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="메시지 입력..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="w-11 h-11 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white active:scale-95 transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })()
              ) : (
                /* Chat List View */
                <div className="p-5">
                  <h2 className="text-xl font-black text-slate-800 mb-4">채팅 목록</h2>
                  <div className="space-y-3">
                    {chats.map(chat => {
                      const linkedItem = items.find(item => item.title === chat.itemTitle)
                      const ChatItemIcon = linkedItem?.imageIcon || Camera
                      const unreadCount = chat.unreadCount ?? (chat.unread ? 1 : 0)

                      return (
                        <div
                          key={chat.id}
                          onClick={() => setActiveChatRoom(chat)}
                          className="bg-white border border-slate-100 rounded-2xl px-3.5 py-3 flex items-center gap-3 cursor-pointer hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                        >
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${linkedItem?.iconColor || 'text-indigo-500 bg-indigo-50'}`}>
                            <ChatItemIcon className="w-7 h-7" />
                          </div>

                          <div className="flex-1 min-w-0 leading-tight">
                            <div className="text-[13px] font-extrabold text-slate-900 truncate">
                              {chat.sender}
                            </div>
                            <div className="text-[12px] font-bold text-slate-700 truncate mt-1">
                              {chat.itemTitle}
                            </div>
                            <div className="text-[12px] font-semibold text-slate-500 truncate mt-1">
                              {chat.lastMessage}
                            </div>
                          </div>

                          <div className="w-16 flex-shrink-0 flex flex-col items-center gap-2">
                            <div className="text-[10px] font-bold text-slate-400 text-center">
                              {chat.time}
                            </div>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${
                              unreadCount > 0
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                              {unreadCount}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
  )
}
