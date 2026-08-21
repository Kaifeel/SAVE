import { useState } from 'react'
import { Bell } from 'lucide-react'

export default function NotificationBell({
  notifications = [],
  onMarkRead = async () => {},
  onMarkAllRead = async () => {},
  onError,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasUnread = notifications.some(notification => !notification.read)

  const run = async action => {
    try {
      await action()
    } catch (error) {
      onError?.(error)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        aria-label="알림 열기"
        aria-expanded={isOpen}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
      >
        <Bell className="w-6 h-6" />
        {hasUnread && (
          <span
            aria-label="읽지 않은 알림 있음"
            className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"
          />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="알림 목록"
          className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl py-3 z-[100] max-h-96 overflow-y-auto"
        >
          <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-800 text-sm">알림</span>
            <button
              type="button"
              onClick={() => run(onMarkAllRead)}
              className="text-xs text-indigo-600 hover:underline"
            >
              모두 읽음
            </button>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">
              새로운 알림이 없습니다.
            </div>
          ) : notifications.map(notification => (
            <button
              key={notification.id}
              type="button"
              onClick={() => {
                if (!notification.read) run(() => onMarkRead(notification.id))
              }}
              className={`block w-full text-left px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-indigo-50/20' : ''}`}
            >
              <span className="flex justify-between items-start">
                <span className="font-bold text-xs text-indigo-600">{notification.title}</span>
                <span className="text-[10px] text-slate-400">{notification.time}</span>
              </span>
              <span className="block text-xs text-slate-600 mt-0.5 leading-relaxed">
                {notification.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
