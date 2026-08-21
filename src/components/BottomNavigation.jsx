import { Home, MessageSquare, Plus, Search, User } from 'lucide-react'
import { NavLink } from 'react-router'

const linkClassName = ({ isActive }) => (
  `flex flex-col items-center flex-1 transition-all ${isActive ? 'scale-105 text-indigo-600' : 'text-slate-400'}`
)

function ActiveDot() {
  return <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />
}

export default function BottomNavigation({ setIsWriteModalOpen, chats }) {
  const hasUnreadChat = chats.some(chat => chat.unread)

  return (
    <nav className="bg-white border-t border-slate-100 py-2.5 px-6 flex justify-between items-center z-40 sm:rounded-b-[40px]">
      <NavLink to="/" end className={linkClassName}>
        {({ isActive }) => (
          <>
            <Home className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">홈</span>
            {isActive && <ActiveDot />}
          </>
        )}
      </NavLink>

      <NavLink to="/search" className={linkClassName}>
        {({ isActive }) => (
          <>
            <Search className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">탐색</span>
            {isActive && <ActiveDot />}
          </>
        )}
      </NavLink>

      <button
        type="button"
        onClick={() => setIsWriteModalOpen(true)}
        className="flex flex-col items-center flex-1 text-slate-400 hover:text-indigo-600 transition-colors relative"
      >
        <span className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 -mt-6 active:scale-95 transition-all">
          <Plus className="w-6 h-6 stroke-[3]" />
        </span>
        <span className="text-[10px] mt-1 font-bold text-indigo-600">글쓰기</span>
      </button>

      <NavLink
        to="/chats"
        className={linkClassName}
        data-unread={String(hasUnreadChat)}
      >
        {({ isActive }) => (
          <>
            <span className="relative">
              <MessageSquare className="w-6 h-6" />
              {hasUnreadChat && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
            </span>
            <span className="text-[10px] mt-1 font-bold">채팅</span>
            {isActive && <ActiveDot />}
          </>
        )}
      </NavLink>

      <NavLink to="/my" className={linkClassName}>
        {({ isActive }) => (
          <>
            <User className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">마이</span>
            {isActive && <ActiveDot />}
          </>
        )}
      </NavLink>
    </nav>
  )
}
