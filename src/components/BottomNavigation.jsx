import { Home, MessageSquare, Plus, Search, User } from 'lucide-react'

export default function BottomNavigation(props) {
  const {
    activeTab,
    setActiveTab,
    setActiveChatRoom,
    setIsWriteModalOpen,
    chats,
  } = props

  return (
        <nav className="bg-white border-t border-slate-100 py-2.5 px-6 flex justify-between items-center z-40 sm:rounded-b-[40px]">
          {/* Home Tab */}
          <button 
            onClick={() => { setActiveTab('home'); setActiveChatRoom(null); }}
            className={`flex flex-col items-center flex-1 transition-all ${activeTab === 'home' ? 'scale-105 text-indigo-600' : 'text-slate-400'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">홈</span>
            {activeTab === 'home' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5"></span>}
          </button>

          {/* Search Tab */}
          <button 
            onClick={() => { setActiveTab('search'); setActiveChatRoom(null); }}
            className={`flex flex-col items-center flex-1 transition-all ${activeTab === 'search' ? 'scale-105 text-indigo-600' : 'text-slate-400'}`}
          >
            <Search className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">탐색</span>
            {activeTab === 'search' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5"></span>}
          </button>

          {/* Write/Post Floating Trigger Tab */}
          <button 
            onClick={() => setIsWriteModalOpen(true)}
            className="flex flex-col items-center flex-1 text-slate-400 hover:text-indigo-600 transition-colors relative"
          >
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 -mt-6 active:scale-95 transition-all">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] mt-1 font-bold text-indigo-600">글쓰기</span>
          </button>

          {/* Chat Tab */}
          <button 
            onClick={() => { setActiveTab('chat'); }}
            className={`flex flex-col items-center flex-1 transition-all ${activeTab === 'chat' ? 'scale-105 text-indigo-600' : 'text-slate-400'}`}
          >
            <div className="relative">
              <MessageSquare className="w-6 h-6" />
              {chats.some(c => c.unread) && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-bold">채팅</span>
            {activeTab === 'chat' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5"></span>}
          </button>

          {/* Profile Tab */}
          <button 
            onClick={() => { setActiveTab('my'); setActiveChatRoom(null); }}
            className={`flex flex-col items-center flex-1 transition-all ${activeTab === 'my' ? 'scale-105 text-indigo-600' : 'text-slate-400'}`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-bold">마이</span>
            {activeTab === 'my' && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5"></span>}
          </button>
        </nav>
  )
}
