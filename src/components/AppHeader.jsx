import { Bell, MapPin } from 'lucide-react'
import NotificationPanel from './NotificationPanel.jsx'

export default function AppHeader({
  university,
  notifications,
  notificationOpen,
  onToggleNotifications,
  onMarkAllRead,
}) {
  return (
    <header className="relative z-30 overflow-visible px-5 py-3.5 bg-white border-b border-slate-100 flex justify-between items-center">
      <div className="flex items-center space-x-1 px-2 py-1.5 rounded-lg">
        <MapPin className="w-5 h-5 text-indigo-600 fill-indigo-100/60" />
        <span className="text-[17px] font-bold text-slate-800">{university}</span>
      </div>

      <div className="flex items-center space-x-3">
        <span className="text-xs font-black tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">SAVE 대여</span>
        <div className="relative">
          <button
            type="button"
            onClick={onToggleNotifications}
            aria-label="알림 열기"
            aria-expanded={notificationOpen}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
          >
            <Bell className="w-6 h-6" />
            {notifications.some(notification => !notification.read) && (
              <span aria-label="읽지 않은 알림 있음" className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>
          <NotificationPanel
            open={notificationOpen}
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
          />
        </div>
      </div>
    </header>
  )
}
