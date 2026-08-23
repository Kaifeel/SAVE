import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import ProductDetailPage from './ProductDetailPage.jsx'
import HomePage from './pages/HomePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import MyPage from './pages/MyPage.jsx'
import RentalsPage from './pages/RentalsPage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'
import BottomNavigation from './components/BottomNavigation.jsx'
import ItemRegistrationModal from './components/ItemRegistrationModal.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfileSetupPage from './pages/ProfileSetupPage.jsx'
import AdminPage, { AdminAccessDenied } from './pages/AdminPage.jsx'
import { INITIAL_ITEMS } from './data/items.js'
import {
  exchangeGoogleLogin,
  loginWithEmail,
  logoutSession,
  refreshSession,
  signUpWithEmail,
} from './api/auth.js'
import { useAuthStore } from './store/authStore.js'
import { createOrGetChatRoom, getChatRooms } from './api/chats.js'
import {
  getNotifications,
  markAllNotificationsRead,
  normalizeNotification,
} from './api/notifications.js'
import { updateMyProfile } from './api/users.js'
import { createReport } from './api/reports.js'
import {
  normalizeChatRoom,
  mergeChatListUpdate,
  mergeChatRoomSnapshot,
  toCreateItemPayload,
} from './api/normalizers.js'
import { subscribeUnauthorized } from './api/client.js'
import { isAutoLoginEnabled, USE_API } from './config/runtime.js'
import { useReferenceData } from './hooks/useReferenceData.js'
import { useItems } from './hooks/useItems.js'
import { useChatRooms } from './hooks/useChatRooms.js'
import { useRentals } from './hooks/useRentals.js'
import { useMyPageData } from './hooks/useMyPageData.js'
import { useRecommendations } from './hooks/useRecommendations.js'
import RentalRequestForm from './components/RentalRequestForm.jsx'
import ReportModal from './components/ReportModal.jsx'
import { addWishlist, removeWishlist } from './api/wishlist.js'
import { useToast } from './components/toast.js'
import { availableItems } from './utils/itemVisibility.js'
import {
  MapPin,
  Bell,
  Camera,
  PenTool,
} from 'lucide-react'

const DEV_AUTO_LOGIN = isAutoLoginEnabled(USE_API, import.meta.env.VITE_AUTO_LOGIN)
const WORKFLOW_NOTIFICATION_TYPES = new Set([
  'RENTAL_REQUESTED',
  'RENTAL_APPROVED',
  'RENTAL_REJECTED',
  'REVIEW_PUBLISHED',
])

function App() {
  const toast = useToast()
  const isAdminPath = window.location.pathname === '/admin'
    || window.location.pathname.startsWith('/admin/')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBoard, setActiveBoard] = useState('borrow')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('home') // home, search, chat, my
  const accessToken = useAuthStore(state => state.accessToken)
  const savedUser = useAuthStore(state => state.user)
  const authStatus = useAuthStore(state => state.authStatus)
  const setSession = useAuthStore(state => state.setSession)
  const updateAuthUser = useAuthStore(state => state.updateUser)
  const clearSession = useAuthStore(state => state.clearSession)
  const savedUniversityId = savedUser?.university_id ?? savedUser?.universityId ?? null
  const savedProfileComplete = Boolean(
    savedUser?.name && savedUser?.department && savedUniversityId,
  )
  const [isLoggedIn, setIsLoggedIn] = useState(
    DEV_AUTO_LOGIN || authStatus === 'authenticated',
  )
  const [isProfileComplete, setIsProfileComplete] = useState(
    DEV_AUTO_LOGIN || savedProfileComplete,
  )
  const [memberName, setMemberName] = useState(
    savedProfileComplete
      ? savedUser.name
      : (DEV_AUTO_LOGIN ? '홍길동' : ''),
  )
  const [memberDepartment, setMemberDepartment] = useState(savedUser?.department || (DEV_AUTO_LOGIN ? '컴퓨터공학과' : ''))
  const [memberUniversityId, setMemberUniversityId] = useState(
    savedUniversityId ?? (DEV_AUTO_LOGIN ? 1 : null),
  )
  const {
    universities,
    pickupLocations,
    error: referenceError,
  } = useReferenceData({
    universityId: memberUniversityId,
    enabled: USE_API,
  })
  const university = universities.find(entry => entry.id === memberUniversityId)?.name
    || savedUser?.university_name
    || savedUser?.universityName
    || (USE_API ? '대학교 정보 없음' : '부경대학교')
  const itemData = useItems({
    universityId: memberUniversityId,
    accessToken,
    enabled: USE_API && isLoggedIn && !isAdminPath,
    initialItems: USE_API ? [] : INITIAL_ITEMS,
  })
  const { items, setItems, reload: reloadItems } = itemData

  // Modals & Sheets
  const [selectedItem, setSelectedItem] = useState(null)
  const [profileTarget, setProfileTarget] = useState(null)
  const [workflowRefreshVersion, setWorkflowRefreshVersion] = useState(0)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState(() => USE_API ? [] : [
    { id: 1, title: '대여 수락 알림', text: '이영희님이 우산 대여를 수락하셨습니다.', time: '5분 전', read: false },
    { id: 2, title: '채팅 메시지', text: '정수민: 대여료 1000원 계좌이체...', time: '어제', read: true },
  ])
  
  const [isSubmittingItem, setIsSubmittingItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null)
  const [rentalRequest, setRentalRequest] = useState(null)
  const authBootstrapStarted = useRef(false)

  // Write item form states
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newPriceType, setNewPriceType] = useState('일')
  const [newPickupLocationId, setNewPickupLocationId] = useState('')
  const [newType, setNewType] = useState('rent') // rent (빌려줘요) or want (구해요)
  const [newDescription, setNewDescription] = useState('')
  const [newPhotos, setNewPhotos] = useState([])

  // Chat tab mock states
  const [chats, setChats] = useState(() => USE_API ? [] : [
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
  const [chatInput, setChatInput] = useState('')
  const handleChatListUpdate = useCallback((response, activeRoomId) => {
    setChats(current => mergeChatListUpdate(current, response, activeRoomId))
  }, [])
  const handleChatRoomRead = useCallback(roomId => {
    setChats(current => current.map(room => String(room.id) === String(roomId)
      ? { ...room, unreadCount: 0, unread: false }
      : room))
  }, [])
  const myPageData = useMyPageData({
    accessToken,
    enabled: USE_API && isLoggedIn && Boolean(accessToken) && !isAdminPath,
  })
  const { reload: reloadMyPage } = myPageData
  const handleRentalChanged = useCallback(() => Promise.allSettled([
    reloadMyPage(),
    reloadItems(),
  ]), [reloadItems, reloadMyPage])
  const rentalData = useRentals({
    accessToken,
    currentUserId: savedUser?.id,
    enabled: USE_API && isLoggedIn && Boolean(accessToken) && !isAdminPath,
    onRentalChanged: handleRentalChanged,
  })
  const { reload: reloadRentals } = rentalData
  const handleNotification = useCallback(response => {
    const incoming = normalizeNotification(response)
    setNotifications(current => current.some(entry => entry.id === incoming.id)
      ? current
      : [incoming, ...current])
    if (WORKFLOW_NOTIFICATION_TYPES.has(incoming.type)) {
      setWorkflowRefreshVersion(value => value + 1)
      Promise.allSettled([
        reloadRentals?.(),
        reloadMyPage?.(),
        reloadItems?.(),
      ])
    }
  }, [reloadItems, reloadMyPage, reloadRentals])
  const chatData = useChatRooms({
    accessToken,
    currentUserId: savedUser?.id,
    realtime: USE_API && !isAdminPath,
    onChatListUpdate: handleChatListUpdate,
    onRoomRead: handleChatRoomRead,
    onNotification: handleNotification,
  })
  const recommendationData = useRecommendations({
    accessToken,
    enabled: USE_API && isLoggedIn && Boolean(accessToken) && !isAdminPath,
    department: memberDepartment,
    interestItems: (myPageData.wishlist.data || []).map(item => item.title),
  })
  const activeChatRoom = chatData.activeRoom
  const setActiveChatRoom = chatData.setActiveRoom

  useEffect(() => {
    if (activeTab === 'rentals' && USE_API && isLoggedIn) reloadRentals?.()
  }, [activeTab, isLoggedIn, reloadRentals])

  useEffect(() => subscribeUnauthorized(() => {
    clearSession()
    setChats([])
    setNotifications([])
    setActiveChatRoom(null)
    setIsLoggedIn(false)
    setIsProfileComplete(false)
    setActiveTab('home')
  }), [clearSession, setActiveChatRoom])

  useEffect(() => {
    if (!USE_API || !isLoggedIn || isAdminPath) return

    let ignore = false

    async function loadApiData() {
      try {
        if (!accessToken) return
        const roomResponse = await getChatRooms(accessToken)
        if (!ignore) setChats(current => mergeChatRoomSnapshot(current, roomResponse))
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || '채팅방 목록을 불러오지 못했습니다.')
        }
      }
    }

    loadApiData()

    return () => {
      ignore = true
    }
  }, [accessToken, isAdminPath, isLoggedIn, toast])

  useEffect(() => {
    if (!USE_API || !isLoggedIn || !isProfileComplete || !accessToken || isAdminPath) return

    let ignore = false

    getNotifications(accessToken)
      .then(response => {
        if (!ignore) setNotifications(response)
      })
      .catch(error => {
        if (!ignore) {
          toast.error(error.message || '알림 목록을 불러오지 못했습니다.')
        }
      })

    return () => {
      ignore = true
    }
  }, [accessToken, isAdminPath, isLoggedIn, isProfileComplete, toast])

  // Filter items based on: Location (Univ), Search Query
  const campusItems = useMemo(() => {
    return items.filter(item => {
      // Location Check
      if (USE_API && memberUniversityId && item.universityId !== memberUniversityId) return false
      if (!USE_API && item.university !== university) return false

      // Search Query Check
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchLoc = item.location.toLowerCase().includes(query)
        return matchTitle || matchLoc
      }

      return true
    })
  }, [items, memberUniversityId, university, searchQuery])

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
  const recommendItems = availableItems(USE_API
    ? (recommendationData.current?.items || [])
    : campusItems.filter(i => i.section === 'recommend'))
  const popularItems = useMemo(() => campusItems.filter(i => i.section === 'popular'), [campusItems])
  const homePopularItems = useMemo(
    () => availableItems(USE_API ? campusItems : popularItems).slice(0, 4),
    [campusItems, popularItems],
  )
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
    setNewType('rent')
    setNewTitle('')
    setNewPrice('')
    setNewPriceType('일')
    setNewPickupLocationId('')
    setNewDescription('')
    setNewPhotos([])
    setEditingItemId(null)
  }

  const closeItemForm = () => {
    resetItemForm()
    setIsWriteModalOpen(false)
  }

  const openCreateItemForm = () => {
    resetItemForm()
    setIsWriteModalOpen(true)
  }

  // Handle uploading new item
  const handleCreateItem = async (e) => {
    e.preventDefault()
    if (!newTitle || !newPrice) return

    setIsSubmittingItem(true)
    const wasEditing = Boolean(editingItemId)

    const SelectedIcon = newType === 'want' ? PenTool : Camera
    const colorClasses = newType === 'want' ? 'text-blue-500 bg-blue-50' : 'text-rose-500 bg-rose-50'

    const newItem = {
      id: Date.now(),
      title: newTitle,
      price: parseInt(newPrice, 10) || 0,
      priceType: newPriceType,
      location: pickupLocations.find(location => location.id === newPickupLocationId)?.name || '캠퍼스 내',
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
      createdAt: new Date().toISOString(),
      photos: newPhotos.map(file => ({ name: file.name, size: file.size }))
    }

    try {
      if (USE_API) {
        const payload = toCreateItemPayload({
          title: newTitle,
          price: newPrice,
          priceType: newPriceType,
          pickupLocationId: newPickupLocationId,
          type: newType,
          description: newDescription,
          photos: newPhotos,
        })
        if (editingItemId) {
          const updated = await itemData.update(editingItemId, payload)
          setSelectedItem(updated)
        } else {
          await itemData.create(payload)
        }
      } else {
        setItems(prev => [newItem, ...prev])
      }

      resetItemForm()
      setIsWriteModalOpen(false)
      toast.success(wasEditing ? '물품이 수정되었습니다.' : '물품이 성공적으로 등록되었습니다.')
    } catch (error) {
      toast.error(error.message || '물품 등록에 실패했습니다.')
    } finally {
      setIsSubmittingItem(false)
    }
  }

  // Handle sending chat message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeChatRoom) return
    const messageText = chatInput.trim()
    setChatInput('')
    if (USE_API) {
      await chatData.send(messageText)
      return
    }
    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text: messageText,
      time: '방금 전',
      deliveryStatus: 'sent',
    }
    setActiveChatRoom(current => ({
      ...current,
      messages: [...current.messages, newMessage],
    }))
  }

  const handleCompleteProfile = async () => {
    if (USE_API && accessToken) {
      try {
        const updatedUser = await updateMyProfile({
          name: memberName,
          department: memberDepartment,
          university_id: memberUniversityId,
        }, accessToken)
        updateAuthUser(updatedUser)
      } catch (error) {
        toast.error(error.message || '회원 정보를 저장하지 못했습니다.')
        return
      }
    }

    setIsProfileComplete(true)
  }

  const applyAuth = useCallback((
    nextAuth,
    fallbackUniversityId = null,
    { installSession = true } = {},
  ) => {
    const user = nextAuth?.user ?? null
    const profileUniversityId = user?.university_id
      ?? user?.universityId
      ?? fallbackUniversityId
      ?? null
    const hasCompletedProfile = Boolean(
      user?.name && user?.department && profileUniversityId,
    )

    setChats([])
    setNotifications([])
    setActiveChatRoom(null)
    if (installSession) setSession(nextAuth)
    setMemberName(user?.name || '')
    setMemberDepartment(user?.department || '')
    setMemberUniversityId(profileUniversityId)
    setIsProfileComplete(hasCompletedProfile)
    setIsLoggedIn(true)
  }, [setActiveChatRoom, setSession])

  useEffect(() => {
    if (!USE_API || DEV_AUTO_LOGIN || authStatus !== 'checking'
      || authBootstrapStarted.current) return undefined
    authBootstrapStarted.current = true

    const params = window.location.hash.startsWith('#')
      ? new URLSearchParams(window.location.hash.slice(1))
      : null
    const code = params?.get('google_login_code')
    if (code) {
      window.history.replaceState(
        null,
        document.title,
        `${window.location.pathname}${window.location.search}`,
      )
    }

    const restore = code ? exchangeGoogleLogin(code) : refreshSession()
    restore
      .then(nextAuth => applyAuth(nextAuth, null, { installSession: Boolean(code) }))
      .catch(error => {
        clearSession()
        setIsLoggedIn(false)
        if (code) toast.error(error.message || 'Google 로그인에 실패했습니다.')
      })
    return undefined
  }, [applyAuth, authStatus, clearSession, toast])

  const handleLogin = async ({ mode, email, password, name, department, universityId }) => {
    const nextAuth = mode === 'signup'
      ? await signUpWithEmail({ email, password, name, department, universityId })
      : await loginWithEmail(email, password)
    applyAuth(nextAuth, universityId)
  }

  const handleLogout = async () => {
    try {
      if (USE_API) await logoutSession()
    } finally {
      clearSession()
      setChats([])
      setNotifications([])
      setIsNotificationOpen(false)
      setActiveChatRoom(null)
      setIsLoggedIn(false)
      setIsProfileComplete(false)
      setActiveTab('home')
    }
  }

  if (USE_API && authStatus === 'checking') {
    return <main>로그인 상태 확인 중...</main>
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} universities={universities} />
  }

  if (isAdminPath) {
    return savedUser?.role === 'ADMIN'
      ? <AdminPage accessToken={accessToken} user={savedUser} onLogout={handleLogout} />
      : <AdminAccessDenied onLogout={handleLogout} />
  }

  if (!isProfileComplete) {
    return (
      <ProfileSetupPage
        memberName={memberName}
        setMemberName={setMemberName}
        memberDepartment={memberDepartment}
        setMemberDepartment={setMemberDepartment}
        memberUniversityId={memberUniversityId}
        setMemberUniversityId={setMemberUniversityId}
        universities={universities}
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
        <header className="relative z-30 overflow-visible px-5 py-3.5 bg-white border-b border-slate-100 flex justify-between items-center">
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
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                aria-label="알림 열기"
                aria-expanded={isNotificationOpen}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell className="w-6 h-6" />
                {notifications.some(n => !n.read) && (
                  <span aria-label="읽지 않은 알림 있음" className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationOpen && (
                <div role="dialog" aria-label="알림 목록" className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl py-3 z-[100] max-h-96 overflow-y-auto">
                  <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">알림</span>
                    <button 
                      onClick={async () => {
                        try {
                          if (USE_API) await markAllNotificationsRead(accessToken)
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                        } catch (error) {
                          toast.error(error.message || '알림 읽음 처리에 실패했습니다.')
                        }
                      }}
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
              recommendationHeadline={recommendationData.current?.headline}
              recommendationError={recommendationData.error}
              onRefreshRecommendations={recommendationData.refresh}
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
              loading={itemData.loading}
              error={itemData.error || referenceError}
              onRetry={itemData.error ? itemData.reload : undefined}
            />
          )}

          {/* TAB 3: CHAT */}
          {activeTab === 'chat' && (
            <ChatPage
              activeChatRoom={activeChatRoom}
              items={items}
              setActiveChatRoom={setActiveChatRoom}
              selectChatRoom={USE_API ? chatData.selectRoom : setActiveChatRoom}
              setSelectedItem={setSelectedItem}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendMessage={handleSendMessage}
              chats={chats}
              loadingMessages={chatData.loadingMessages}
              loadingOlder={chatData.loadingOlder}
              hasOlder={chatData.hasOlder}
              loadOlder={chatData.loadOlder}
              messageError={chatData.messageError}
              retryMessage={chatData.retry}
              socketState={USE_API ? chatData.socketState : undefined}
            />
          )}

          {/* TAB 4: MY PAGE */}
          {activeTab === 'my' && (
            <MyPage
              memberName={memberName}
              memberDepartment={memberDepartment}
              popularItems={USE_API ? [] : popularItems}
              setSelectedItem={setSelectedItem}
              recommendItems={USE_API ? [] : recommendItems}
              onLogout={handleLogout}
              onOpenRentals={() => setActiveTab('rentals')}
              data={myPageData}
            />
          )}
          {activeTab === 'rentals' && (
            <RentalsPage
              data={rentalData}
              onBack={() => setActiveTab('my')}
              onError={message => toast.error(message)}
            />
          )}

        </main>

        {/* BOTTOM TAB NAVIGATION BAR */}
        <BottomNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setActiveChatRoom={setActiveChatRoom}
          setIsWriteModalOpen={open => open ? openCreateItemForm() : closeItemForm()}
          chats={chats}
        />

        {/* --- MODALS & DRAWERS --- */}

        {/* 2. ITEM DETAIL DRAWER/SHEET */}
        {selectedItem && (
          <ProductDetailPage
            item={selectedItem}
            onClose={() => {
              setProfileTarget(null)
              setSelectedItem(null)
            }}
            isOwner={Boolean(savedUser?.id && selectedItem.ownerId === savedUser.id)}
            onOwnerProfile={setProfileTarget}
            onEdit={(item) => {
              setEditingItemId(item.id)
              setNewTitle(item.title)
              setNewPrice(String(item.price))
              setNewPriceType(item.priceType)
              setNewPickupLocationId(item.pickupLocationId || '')
              setNewType(item.type)
              setNewDescription(item.description)
              setNewPhotos([])
              setSelectedItem(null)
              setIsWriteModalOpen(true)
            }}
            onDelete={async itemId => {
              try {
                await itemData.remove(itemId)
                setSelectedItem(null)
                toast.success('물품이 삭제되었습니다.')
              } catch (error) {
                toast.error(error.message || '물품을 삭제하지 못했습니다.')
              }
            }}
            onRental={async () => {
              try {
                const room = normalizeChatRoom(
                  await createOrGetChatRoom(selectedItem.id, accessToken, { enabled: USE_API }),
                )
                setRentalRequest({ item: selectedItem, chatRoomId: room.roomId || room.id })
                setSelectedItem(null)
              } catch (error) {
                toast.error(error.message || '대여 요청을 준비하지 못했습니다.')
              }
            }}
            onToggleWishlist={async item => {
              const previous = item
              const optimistic = {
                ...item,
                wishlisted: !item.wishlisted,
                wishlistCount: Math.max(
                  0,
                  (item.wishlistCount || 0) + (item.wishlisted ? -1 : 1),
                ),
              }
              setSelectedItem(optimistic)
              try {
                if (item.wishlisted) {
                  await removeWishlist(item.id, accessToken, { enabled: USE_API })
                } else {
                  await addWishlist(item.id, accessToken, { enabled: USE_API })
                }
                setItems(current => current.map(entry => entry.id === item.id ? optimistic : entry))
              } catch (error) {
                setSelectedItem(previous)
                toast.error(error.message || '찜 처리에 실패했습니다.')
              }
            }}
            onReport={item => {
              setReportTarget(item)
              setReportReason('')
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
                  await chatData.selectRoom(apiRoom)
                  setActiveTab('chat')
                  setSelectedItem(null)
                  return
                } catch (error) {
                  toast.error(error.message || '채팅방을 만들지 못했습니다.')
                  return
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

        {profileTarget && (
          <UserProfilePage
            userId={profileTarget.ownerId}
            accessToken={accessToken}
            enabled={USE_API}
            refreshKey={workflowRefreshVersion}
            fallbackItem={profileTarget}
            fallbackItems={items.filter(item => profileTarget.ownerId
              ? item.ownerId === profileTarget.ownerId
              : item.owner === profileTarget.owner)}
            onBack={() => setProfileTarget(null)}
            onSelectItem={item => {
              setSelectedItem(item)
              setProfileTarget(null)
            }}
            canReport={!savedUser?.id || profileTarget.ownerId !== savedUser.id}
            onReport={() => {
              setProfileTarget(null)
              setReportTarget(profileTarget)
              setReportReason('')
            }}
          />
        )}

        <ReportModal
          isOpen={Boolean(reportTarget)}
          item={reportTarget}
          reason={reportReason}
          setReason={setReportReason}
          isSubmitting={isSubmittingReport}
          onClose={() => {
            if (isSubmittingReport) return
            setReportTarget(null)
            setReportReason('')
          }}
          onSubmit={async event => {
            event.preventDefault()
            const reason = reportReason.trim()
            if (!reportTarget || reason.length < 10 || isSubmittingReport) return

            setIsSubmittingReport(true)
            try {
              if (USE_API) {
                await createReport({
                  reported_user_id: reportTarget.ownerId,
                  item_id: reportTarget.id,
                  reason,
                }, accessToken)
              }
              setReportTarget(null)
              setReportReason('')
              toast.success('신고가 접수되었습니다.')
            } catch (error) {
              toast.error(error.message || '신고 접수에 실패했습니다.')
            } finally {
              setIsSubmittingReport(false)
            }
          }}
        />
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
          newPickupLocationId={newPickupLocationId}
          setNewPickupLocationId={setNewPickupLocationId}
          pickupLocations={pickupLocations}
          newDescription={newDescription}
          setNewDescription={setNewDescription}
          isSubmittingItem={isSubmittingItem}
          editingItemId={editingItemId}
          onClose={closeItemForm}
        />
        {rentalRequest && (
          <div className="absolute inset-0 z-[60] flex items-end bg-black/50 p-4">
            <RentalRequestForm
              item={rentalRequest.item}
              chatRoomId={rentalRequest.chatRoomId}
              onClose={() => setRentalRequest(null)}
              onSubmit={async payload => {
                try {
                  await rentalData.create(payload)
                  setRentalRequest(null)
                  toast.success('대여 요청을 보냈습니다.')
                } catch (error) {
                  toast.error(error.message || '대여 요청에 실패했습니다.')
                }
              }}
            />
          </div>
        )}

      </div>
    </div>
  )
}

export default App
