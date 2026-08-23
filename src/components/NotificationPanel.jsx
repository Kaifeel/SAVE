export default function NotificationPanel({
  open,
  notifications,
  onMarkAllRead,
}) {
  if (!open) return null

  return (
    <div role="dialog" aria-label="알림 목록" className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl py-3 z-[100] max-h-96 overflow-y-auto">
      <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
        <span className="font-bold text-slate-800 text-sm">알림</span>
        <button
          onClick={onMarkAllRead}
          className="text-xs text-indigo-600 hover:underline"
        >
          모두 읽음
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-400">새로운 알림이 없습니다.</div>
      ) : (
        notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-indigo-50/20' : ''}`}
          >
            <div className="flex justify-between items-start">
              <span className="font-bold text-xs text-indigo-600">{notification.title}</span>
              <span className="text-[10px] text-slate-400">{notification.time}</span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notification.text}</p>
          </div>
        ))
      )}
    </div>
  )
}
