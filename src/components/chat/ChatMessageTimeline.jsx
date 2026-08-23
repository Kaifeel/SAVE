import { Fragment } from 'react'
import { formatChatDate, formatChatTime, getChatDateKey } from '../../chat/presentation.js'

export default function ChatMessageTimeline({
  room,
  linkedItem,
  ItemIcon,
  loadingMessages,
  loadingOlder,
  hasOlder,
  loadOlder,
  messageError,
  retryMessage,
  socketState,
}) {
  return (
    <>
      {socketState && socketState !== 'connected' && (
        <div role="status" className="bg-slate-100 px-4 py-1.5 text-center text-[10px] font-semibold text-slate-500">
          실시간 연결을 복구하는 중...
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {hasOlder && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 disabled:text-slate-300"
            >
              {loadingOlder ? '이전 메시지를 불러오는 중...' : '이전 메시지 보기'}
            </button>
          </div>
        )}
        {loadingMessages && <div role="status" className="text-center text-xs text-slate-400">메시지를 불러오는 중...</div>}
        {messageError && <div role="alert" className="text-center text-xs text-rose-600">{messageError.message}</div>}
        {(room.messages || []).map((message, index, messages) => {
          const isMe = message.sender === 'me'
          const currentDateKey = getChatDateKey(message.time)
          const previousDateKey = index > 0 ? getChatDateKey(messages[index - 1].time) : null
          const showDateSeparator = Boolean(currentDateKey && currentDateKey !== previousDateKey)

          return (
            <Fragment key={message.id}>
              {showDateSeparator && (
                <div className="text-center text-[10px] text-slate-400 bg-slate-200/60 rounded-full px-4 py-1.5 w-max mx-auto mb-2">
                  {formatChatDate(message.time)}
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${linkedItem?.iconColor || 'text-indigo-500 bg-indigo-50'}`}>
                    <ItemIcon className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-5 shadow-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
                  }`}>
                    {message.text}
                  </div>
                  <span className={`text-[9px] mt-1 ${isMe ? 'text-indigo-300' : 'text-slate-400'}`}>
                    {isMe && message.deliveryStatus === 'sent' && <span className="mr-1">✓✓</span>}
                    {message.deliveryStatus === 'sending' && <span className="mr-1">전송 중</span>}
                    {message.deliveryStatus === 'failed' && (
                      <button
                        type="button"
                        className="mr-1 font-bold text-rose-500"
                        onClick={() => retryMessage?.(message.clientId)}
                      >
                        재전송
                      </button>
                    )}
                    {formatChatTime(message.time)}
                  </span>
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </>
  )
}
