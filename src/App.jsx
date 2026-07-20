import { useState, useMemo, useEffect } from 'react'
import ProductDetailPage from './ProductDetailPage.jsx'
import HomePage from './pages/HomePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import MyPage from './pages/MyPage.jsx'
import BottomNavigation from './components/BottomNavigation.jsx'
import ItemRegistrationModal from './components/ItemRegistrationModal.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfileSetupPage from './pages/ProfileSetupPage.jsx'
import { INITIAL_ITEMS } from './data/items.js'
import {
  clearSavedAuth,
  getAccessToken,
  getAuthUser,
  getSavedAuth,
  loginWithEmail,
  saveAuth,
  signUpWithEmail,
} from './api/auth.js'
import { getItems, createItem } from './api/items.js'
import { createOrGetChatRoom, getChatRooms, sendChatMessage } from './api/chats.js'
import { updateMyProfile } from './api/users.js'
import { createReport } from './api/reports.js'
import {
  normalizeChatRoom,
  normalizeChatRoomsResponse,
  normalizeItem,
  normalizeItemsResponse,
  toCreateItemPayload,
} from './api/normalizers.js'
import {
  MapPin,
  Bell,
  Camera,
  PenTool,
} from 'lucide-react'

const DEV_AUTO_LOGIN = import.meta.env.VITE_AUTO_LOGIN === 'true'
const USE_API = import.meta.env.VITE_USE_API === 'true'

function App() {
  const university = '부경대학교'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBoard, setActiveBoard] = useState('borrow')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('home') // home, search, chat, my
  const [auth, setAuth] = useState(() => getSavedAuth())
  const accessToken = getAccessToken(auth)
  const savedUser = getAuthUser(auth)
  const [isLoggedIn, setIsLoggedIn] = useState(DEV_AUTO_LOGIN || Boolean(accessToken))
  const [isProfileComplete, setIsProfileComplete] = useState(
    DEV_AUTO_LOGIN || Boolean(savedUser?.name && savedUser?.department),
  )
  const [memberName, setMemberName] = useState(savedUser?.name || (DEV_AUTO_LOGIN ? '홍길동' : ''))
  const [memberDepartment, setMemberDepartment] = useState(savedUser?.department || (DEV_AUTO_LOGIN ? '컴퓨터공학과' : ''))
  const [items, setItems] = useState(INITIAL_ITEMS)

  // Modals & Sheets
  const [selectedItem, setSelectedItem] = useState(null)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  
  const [isSubmittingItem, setIsSubmittingItem] = useState(false)

  // Write item form states
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newPriceType, setNewPriceType] = useState('일')
  const [newLocation, setNewLocation] = useState('')
  const [newType, setNewType] = useState('rent') // rent (빌려줘요) or want (구해요)
  const [newDescription, setNewDescription] = useState('')
  const [newPhotos, setNewPhotos] = useState([])

  // Chat tab mock states
  const [chats, setChats] = useState([
    {
      id: 1,
      sender: '이영희',
      itemTitle: '우산 (장우산)',
      lastMessage: '저 다와가요. 3분 안에 도착합니다.',
      time: '오후 4:08',
      unread: false,
      unreadCount: 0,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
      messages: [
        { id: 1, sender: 'other', text: '안녕하세요! 우산 대여하고 싶은데 10분 뒤 누리관 1층 로비에서 빌릴 수 있을까요?', time: '오후 4:00' },
        { id: 2, sender: 'me', text: '네 안녕하세요! 가능합니다.', time: '오후 4:01' },
        { id: 3, sender: 'other', text: '대여료는 계좌이체 가능한가요?', time: '오후 4:02' },
        { id: 4, sender: 'me', text: '네 가능합니다.', time: '오후 4:03' },
        { id: 5, sender: 'other', text: '저 도착했는데 어디쯤이신가요?', time: '오후 4:10' },
        { id: 6, sender: 'me', text: '저 다와가요. 3분 안에 도착합니다.', time: '오후 4:11' }
      ]
    },
    {
      id: 2,
      sender: '정수민',
      itemTitle: 'USB C타입 고속 충전기',
      lastMessage: '대여료 1000원 계좌이체 해드렸습니다! 확인 부탁드려요.',
      time: '어제',
      unread: true,
      unreadCount: 2,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100',
      messages: [
        { id: 1, sender: 'me', text: '충전기 빌리고 싶습니다.', time: '어제 오후 2:00' },
        { id: 2, sender: 'other', text: '아 네! 청운관 1열람실 입구 쪽에 놓아둘게요.', time: '어제 오후 2:05' },
        { id: 3, sender: 'me', text: '네 감사합니다!', time: '어제 오후 2:10' },
        { id: 4, sender: 'other', text: '대여료 1000원 계좌이체 해드렸습니다! 확인 부탁드려요.', time: '어제 오후 3:00' }
      ]
    }
  ])
  const [activeChatRoom, setActiveChatRoom] = useState(null)
  const [chatInput, setChatInput] = useState('')

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, title: '대여 수락 알림', text: '이영희님이 우산 대여를 수락하셨습니다.', time: '5분 전', read: false },
    { id: 2, title: '채팅 메시지', text: '정수민: 대여료 1000원 계좌이체...', time: '어제', read: true }
  ])

  useEffect(() => {
    if (!USE_API || !isLoggedIn) return

    let ignore = false

    async function loadApiData() {
      try {
        const itemResponse = await getItems({ university }, accessToken)
        if (!ignore) setItems(normalizeItemsResponse(itemResponse))
      } catch (error) {
        console.warn('물품 목록 API 연동 실패, 더미 데이터를 유지합니다.', error)
      }

      if (!accessToken) return

      try {
        const roomResponse = await getChatRooms(accessToken)
        if (!ignore) setChats(normalizeChatRoomsResponse(roomResponse))
      } catch (error) {
        console.warn('채팅방 목록 API 연동 실패, 더미 데이터를 유지합니다.', error)
      }
    }

    loadApiData()

    return () => {
      ignore = true
    }
  }, [accessToken, isLoggedIn, university])

  // Filter items based on: Location (Univ), Search Query
  const campusItems = useMemo(() => {
    return items.filter(item => {
      // Location Check
      if (item.university !== university) return false

      // Search Query Check
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchLoc = item.location.toLowerCase().includes(query)
        return matchTitle || matchLoc
      }

      return true
    })
  }, [items, university, searchQuery])

  // Search tab filters: board split and availability
  const filteredItems = useMemo(() => {
    const boardItems = campusItems.filter(item => {
      const isWantPost = item.type === 'want'
      if (activeBoard === 'borrow' && !isWantPost) return false
      if (activeBoard === 'lend' && isWantPost) return false
      if (availableOnly && item.status !== 'available') return false
      return true
    })

    return [...boardItems].sort((a, b) => {
      if (a.status === 'rented' && b.status !== 'rented') return -1
      if (a.status !== 'rented' && b.status === 'rented') return 1
      return 0
    })
  }, [campusItems, activeBoard, availableOnly])

  // Split into sections
  // TODO: API 연동 후 아래 주석을 해제하고 aiRecommend.items 사용
  // const recommendItems = aiRecommend.items
  const recommendItems = useMemo(() => campusItems.filter(i => i.section === 'recommend'), [campusItems])
  const popularItems = useMemo(() => campusItems.filter(i => i.section === 'popular'), [campusItems])
  const homePopularItems = useMemo(() => {
    const priority = ['USB C타입 고속 충전기', '공학용 계산기 (TI-84)', '군화', '이산수학 전공책']

    return [...popularItems].sort((a, b) => {
      const aIndex = priority.indexOf(a.title)
      const bIndex = priority.indexOf(b.title)
      const safeAIndex = aIndex === -1 ? priority.length : aIndex
      const safeBIndex = bIndex === -1 ? priority.length : bIndex
      return safeAIndex - safeBIndex
    })
  }, [popularItems])
  const recentItems = useMemo(() => campusItems.filter(i => i.section === 'recent'), [campusItems])

  const handlePhotoSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setNewPhotos(prev => [...prev, ...selectedFiles].slice(0, 5))
    e.target.value = ''
  }

  const handlePhotoRemove = (index) => {
    setNewPhotos(prev => prev.filter((_, photoIndex) => photoIndex !== index))
  }

  const resetItemForm = () => {
    setNewTitle('')
    setNewPrice('')
    setNewLocation('')
    setNewDescription('')
    setNewPhotos([])
  }

  // Handle uploading new item
  const handleCreateItem = async (e) => {
    e.preventDefault()
    if (!newTitle || !newPrice) return

    setIsSubmittingItem(true)

    const SelectedIcon = newType === 'want' ? PenTool : Camera
    const colorClasses = newType === 'want' ? 'text-blue-500 bg-blue-50' : 'text-rose-500 bg-rose-50'

    const newItem = {
      id: Date.now(),
      title: newTitle,
      price: parseInt(newPrice, 10) || 0,
      priceType: newPriceType,
      location: newLocation || '캠퍼스 내',
      badge: '신규',
      section: 'recent',
      type: newType,
      university: university,
      rating: 5.0,
      reviews: 0,
      owner: '나 (학생인증완료)',
      description: newDescription || '설명이 작성되지 않았습니다.',
      imageIcon: SelectedIcon,
      iconColor: colorClasses,
      status: 'available',
      photos: newPhotos.map(file => ({ name: file.name, size: file.size }))
    }

    try {
      if (USE_API) {
        const payload = toCreateItemPayload({
          title: newTitle,
          price: newPrice,
          priceType: newPriceType,
          location: newLocation || '캠퍼스 내',
          type: newType,
          description: newDescription,
          photos: newPhotos,
        })
        const createdItem = await createItem(payload, accessToken)
        setItems(prev => [normalizeItem(createdItem), ...prev])
      } else {
        setItems(prev => [newItem, ...prev])
      }

      resetItemForm()
      setIsWriteModalOpen(false)
      alert('물품이 성공적으로 등록되었습니다!')
    } catch (error) {
      console.error('물품 등록 API 연동 실패', error)
      alert('물품 등록에 실패했습니다. 백엔드 API 상태를 확인해주세요.')
    } finally {
      setIsSubmittingItem(false)
    }
  }

  // Handle sending chat message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeChatRoom) return
    const messageText = chatInput.trim()

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text: messageText,
      time: '방금 전'
    }

    setChats(prev => prev.map(c => {
      if (c.id === activeChatRoom.id) {
        return {
          ...c,
          lastMessage: messageText,
          time: '방금 전',
          messages: [...c.messages, newMessage]
        }
      }
      return c
    }))

    setActiveChatRoom(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }))

    setChatInput('')

    if (!USE_API) return

    try {
      const roomId = activeChatRoom.roomId || activeChatRoom.id
      await sendChatMessage(roomId, messageText, accessToken)
    } catch (error) {
      console.error('채팅 메시지 전송 API 연동 실패', error)
      alert('메시지 전송 API 호출에 실패했습니다.')
    }
  }

  const handleCompleteProfile = async () => {
    if (USE_API && accessToken) {
      try {
        await updateMyProfile({
          name: memberName,
          department: memberDepartment,
        }, accessToken)
      } catch (error) {
        console.error('회원 정보 수정 API 연동 실패', error)
        alert('회원 정보 저장 API 호출에 실패했습니다.')
        return
      }
    }

    setIsProfileComplete(true)
  }

  const handleLogin = async ({ mode, email, password, name, department }) => {
    const nextAuth = mode === 'signup'
      ? await signUpWithEmail({ email, password, name, department })
      : await loginWithEmail(email, password)
    const user = getAuthUser(nextAuth)

    saveAuth(nextAuth)
    setAuth(nextAuth)
    setMemberName(user?.name || '')
    setMemberDepartment(user?.department || '')
    setIsProfileComplete(Boolean(user?.name && user?.department))
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    clearSavedAuth()
    setAuth(null)
    setIsLoggedIn(false)
    setIsProfileComplete(false)
    setActiveTab('home')
  }

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />

  if (!isProfileComplete) {
    return (
      <ProfileSetupPage
        memberName={memberName}
        setMemberName={setMemberName}
        memberDepartment={memberDepartment}
        setMemberDepartment={setMemberDepartment}
        onComplete={handleCompleteProfile}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-0 sm:py-6 px-0 sm:px-4">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-[430px] h-[932px] sm:h-[844px] bg-white sm:rounded-[40px] sm:shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative font-sans">
        
        {/* TOP STATUS BAR MOCK */}
        <div className="bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs text-slate-500 font-semibold select-none border-b border-slate-50/50">
          <span>16:07</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-2.5 border border-slate-400 rounded-sm relative after:content-[''] after:absolute after:top-0.5 after:-right-1 after:w-0.5 after:h-1 after:bg-slate-400"></span>
            <span>5G</span>
          </div>
        </div>

        {/* HEADER AREA */}
        <header className="px-5 py-3.5 bg-white border-b border-slate-100 flex justify-between items-center z-10">
          {/* University Display */}
          <div className="flex items-center space-x-1 px-2 py-1.5 rounded-lg">
            <MapPin className="w-5 h-5 text-indigo-600 fill-indigo-100/60" />
            <span className="text-[17px] font-bold text-slate-800">{university}</span>
          </div>

          {/* Logo Name & Notifications */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-black tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">SAVE 대여</span>
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell className="w-6 h-6" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl py-3 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">알림</span>
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      모두 읽음
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-400">새로운 알림이 없습니다.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-indigo-50/20' : ''}`}>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-indigo-600">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN DISPLAY AREA */}
        <main className={`flex-1 overflow-y-auto bg-slate-50/50 ${activeTab === 'chat' && activeChatRoom ? 'pb-0' : 'pb-20'}`}>
          
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <HomePage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              recommendItems={recommendItems}
              setSelectedItem={setSelectedItem}
              homePopularItems={homePopularItems}
              setActiveTab={setActiveTab}
              recentItems={recentItems}
              filteredItems={filteredItems}
            />
          )}

          {/* TAB 2: SEARCH */}
          {activeTab === 'search' && (
            <SearchPage
              activeBoard={activeBoard}
              setActiveBoard={setActiveBoard}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              availableOnly={availableOnly}
              setAvailableOnly={setAvailableOnly}
              filteredItems={filteredItems}
              setSelectedItem={setSelectedItem}
            />
          )}

          {/* TAB 3: CHAT */}
          {activeTab === 'chat' && (
            <ChatPage
              activeChatRoom={activeChatRoom}
              items={items}
              setActiveChatRoom={setActiveChatRoom}
              setSelectedItem={setSelectedItem}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendMessage={handleSendMessage}
              chats={chats}
            />
          )}

          {/* TAB 4: MY PAGE */}
          {activeTab === 'my' && (
            <MyPage
              memberName={memberName}
              memberDepartment={memberDepartment}
              popularItems={popularItems}
              setSelectedItem={setSelectedItem}
              recommendItems={recommendItems}
              onLogout={handleLogout}
            />
          )}

        </main>

        {/* BOTTOM TAB NAVIGATION BAR */}
        <BottomNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setActiveChatRoom={setActiveChatRoom}
          setIsWriteModalOpen={setIsWriteModalOpen}
          chats={chats}
        />

        {/* --- MODALS & DRAWERS --- */}

        {/* 2. ITEM DETAIL DRAWER/SHEET */}
        {selectedItem && (
          <ProductDetailPage
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onReport={async () => {
              try {
                if (USE_API) {
                  await createReport({
                    reported_user_id: selectedItem.raw?.user_id,
                    item_id: selectedItem.id,
                    reason: '부적절한 사용자 또는 물품 신고',
                  }, accessToken)
                }
                alert('신고가 접수되었습니다.')
              } catch (error) {
                console.error('신고 API 연동 실패', error)
                alert('신고 접수 API 호출에 실패했습니다.')
              }
            }}
            onChat={async () => {
              if (USE_API && selectedItem.id) {
                try {
                  const roomResponse = await createOrGetChatRoom(selectedItem.id, accessToken)
                  const apiRoom = normalizeChatRoom(roomResponse)

                  setChats(prev => {
                    const exists = prev.some(room => room.id === apiRoom.id)
                    return exists
                      ? prev.map(room => room.id === apiRoom.id ? apiRoom : room)
                      : [apiRoom, ...prev]
                  })
                  setActiveChatRoom(apiRoom)
                  setActiveTab('chat')
                  setSelectedItem(null)
                  return
                } catch (error) {
                  console.error('채팅방 생성 API 연동 실패, 더미 채팅방을 생성합니다.', error)
                }
              }

              const existingChat = chats.find(c => c.sender === selectedItem.owner.split(' ')[0])
              if (existingChat) {
                setActiveChatRoom(existingChat)
              } else {
                const newRoom = {
                  id: Date.now(),
                  sender: selectedItem.owner.split(' ')[0],
                  itemTitle: selectedItem.title,
                  lastMessage: '대여 문의드립니다!',
                  time: '방금 전',
                  unread: false,
                  unreadCount: 0,
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
                  messages: [
                    { id: 1, sender: 'me', text: `안녕하세요! [${selectedItem.title}] 대여 가능할까요?`, time: '방금 전' }
                  ]
                }
                setChats(prev => [newRoom, ...prev])
                setActiveChatRoom(newRoom)
              }
              setActiveTab('chat')
              setSelectedItem(null)
            }}
          />
        )}
        {/* 3. WRITE MODAL (SLIDE UP) */}
        <ItemRegistrationModal
          isOpen={isWriteModalOpen}
          setIsWriteModalOpen={setIsWriteModalOpen}
          handleCreateItem={handleCreateItem}
          newType={newType}
          setNewType={setNewType}
          newPhotos={newPhotos}
          handlePhotoSelect={handlePhotoSelect}
          handlePhotoRemove={handlePhotoRemove}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newPrice={newPrice}
          setNewPrice={setNewPrice}
          newPriceType={newPriceType}
          setNewPriceType={setNewPriceType}
          newLocation={newLocation}
          setNewLocation={setNewLocation}
          newDescription={newDescription}
          setNewDescription={setNewDescription}
          isSubmittingItem={isSubmittingItem}
        />

      </div>
    </div>
  )
}

export default App
