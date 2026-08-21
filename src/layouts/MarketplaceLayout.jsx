import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import ProductDetailPage from '../ProductDetailPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import SearchPage from '../pages/SearchPage.jsx'
import ChatPage from '../pages/ChatPage.jsx'
import MyPage from '../pages/MyPage.jsx'
import RentalsPage from '../pages/RentalsPage.jsx'
import UserProfilePage from '../pages/UserProfilePage.jsx'
import BottomNavigation from '../components/BottomNavigation.jsx'
import ItemRegistrationModal from '../components/ItemRegistrationModal.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import ProfileSetupPage from '../pages/ProfileSetupPage.jsx'
import AdminPage, { AdminAccessDenied } from '../pages/AdminPage.jsx'
import { INITIAL_ITEMS } from '../data/items.js'
import { useAuthStore } from '../store/authStore.js'
import { createOrGetChatRoom, getChatRooms } from '../api/chats.js'
import { createReport } from '../api/reports.js'
import {
  normalizeChatRoom,
  mergeChatListUpdate,
  mergeChatRoomSnapshot,
} from '../api/normalizers.js'
import { subscribeUnauthorized } from '../api/client.js'
import { USE_API } from '../config/runtime.js'
import { useReferenceData } from '../hooks/useReferenceData.js'
import { useItems } from '../hooks/useItems.js'
import { useChatRooms } from '../hooks/useChatRooms.js'
import { useRentals } from '../hooks/useRentals.js'
import { useMyPageData } from '../hooks/useMyPageData.js'
import { useRecommendations } from '../hooks/useRecommendations.js'
import { useNotifications } from '../hooks/useNotifications.js'
import { useItemEditor } from '../hooks/useItemEditor.js'
import RentalRequestForm from '../components/RentalRequestForm.jsx'
import ReportModal from '../components/ReportModal.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import { addWishlist, removeWishlist } from '../api/wishlist.js'
import { useToast } from '../components/toast.js'
import { availableItems } from '../utils/itemVisibility.js'
import { MapPin } from 'lucide-react'

const WORKFLOW_NOTIFICATION_TYPES = new Set([
  'RENTAL_REQUESTED',
  'RENTAL_APPROVED',
  'RENTAL_REJECTED',
  'REVIEW_PUBLISHED',
])

function MarketplaceLayout({ auth }) {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminPath = location.pathname === '/admin'
    || location.pathname.startsWith('/admin/')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBoard, setActiveBoard] = useState('borrow')
  const [availableOnly, setAvailableOnly] = useState(false)
  const activeTab = location.pathname.startsWith('/search')
    ? 'search'
    : location.pathname.startsWith('/chats')
      ? 'chat'
      : location.pathname.startsWith('/rentals')
        ? 'rentals'
        : location.pathname.startsWith('/my')
          ? 'my'
          : 'home'
  const setActiveTab = useCallback(tab => {
    const routes = {
      home: '/',
      search: '/search',
      chat: '/chats',
      my: '/my',
      rentals: '/rentals',
    }
    navigate(routes[tab] || '/')
  }, [navigate])
  const clearSession = useAuthStore(state => state.clearSession)
  const {
    accessToken,
    user: savedUser,
    authStatus,
    isLoggedIn,
    isProfileComplete,
    memberName,
    setMemberName,
    memberDepartment,
    setMemberDepartment,
    memberUniversityId,
    setMemberUniversityId,
  } = auth
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
    || '부경대학교'
  const itemData = useItems({
    universityId: memberUniversityId,
    accessToken,
    enabled: USE_API && isLoggedIn && !isAdminPath,
    initialItems: USE_API ? [] : INITIAL_ITEMS,
  })
  const { items, setItems, reload: reloadItems } = itemData

  // Modals & Sheets
  const itemRouteId = location.pathname.match(/^\/items\/(\d+)$/)?.[1] ?? null
  const profileRouteId = location.pathname.match(/^\/users\/(\d+)$/)?.[1] ?? null
  const roomRouteId = location.pathname.match(/^\/chats\/(\d+)$/)?.[1] ?? null
  const [selectedItemOverride, setSelectedItem] = useState(null)
  const [profileTargetOverride, setProfileTarget] = useState(null)
  const selectedItem = itemRouteId
    ? (String(selectedItemOverride?.id) === itemRouteId
        ? selectedItemOverride
        : items.find(item => String(item.id) === itemRouteId) || null)
    : null
  const profileTarget = profileRouteId
    ? (String(profileTargetOverride?.ownerId) === profileRouteId
        ? profileTargetOverride
        : items.find(item => String(item.ownerId) === profileRouteId)
          || { ownerId: Number(profileRouteId) })
    : null
  const [workflowRefreshVersion, setWorkflowRefreshVersion] = useState(0)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [rentalRequest, setRentalRequest] = useState(null)
  const itemEditor = useItemEditor({
    useApi: USE_API,
    itemData,
    setItems,
    pickupLocations,
    university,
    onClose: () => setIsWriteModalOpen(false),
    onSelectedItem: setSelectedItem,
    onSuccess: message => toast.success(message),
    onError: error => toast.error(error.message || '물품 등록에 실패했습니다.'),
  })

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
  const [chatRoomsLoaded, setChatRoomsLoaded] = useState(!USE_API)
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
  const handleWorkflowNotification = useCallback(incoming => {
    if (WORKFLOW_NOTIFICATION_TYPES.has(incoming.type)) {
      setWorkflowRefreshVersion(value => value + 1)
      Promise.allSettled([
        reloadRentals?.(),
        reloadMyPage?.(),
        reloadItems?.(),
      ])
    }
  }, [reloadItems, reloadMyPage, reloadRentals])
  const handleNotificationError = useCallback(error => {
    toast.error(error.message || '알림 목록을 불러오지 못했습니다.')
  }, [toast])
  const notificationData = useNotifications({
    accessToken,
    enabled: USE_API && isLoggedIn && isProfileComplete && !isAdminPath,
    initialNotifications: USE_API ? [] : [
      { id: 1, title: '대여 수락 알림', text: '이영희님이 우산 대여를 수락하셨습니다.', time: '5분 전', read: false },
      { id: 2, title: '채팅 메시지', text: '정수민: 대여료 1000원 계좌이체...', time: '어제', read: true },
    ],
    onWorkflowNotification: handleWorkflowNotification,
    onError: handleNotificationError,
  })
  const {
    notifications,
    handleRealtime: handleNotification,
    reload: reloadNotifications,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
    clear: clearNotifications,
  } = notificationData
  const handleRealtimeReconnect = useCallback(() => Promise.allSettled([
    reloadNotifications(),
    getChatRooms(accessToken).then(response => {
      setChats(current => mergeChatRoomSnapshot(current, response))
    }),
  ]), [accessToken, reloadNotifications])
  const chatData = useChatRooms({
    accessToken,
    currentUserId: savedUser?.id,
    realtime: USE_API && !isAdminPath,
    onChatListUpdate: handleChatListUpdate,
    onRoomRead: handleChatRoomRead,
    onNotification: handleNotification,
    onReconnect: handleRealtimeReconnect,
  })
  const recommendationData = useRecommendations({
    accessToken,
    enabled: USE_API && isLoggedIn && Boolean(accessToken) && !isAdminPath,
    department: memberDepartment,
    interestItems: (myPageData.wishlist.data || []).map(item => item.title),
  })
  const activeChatRoom = roomRouteId
    ? (String(chatData.activeRoom?.id) === roomRouteId
        ? chatData.activeRoom
        : chats.find(room => String(room.id) === roomRouteId) || null)
    : null
  const setActiveChatRoom = chatData.setActiveRoom

  const openItem = useCallback(item => {
    setSelectedItem(item)
    if (item?.id) navigate(`/items/${item.id}`)
  }, [navigate])

  const openProfile = useCallback(item => {
    setProfileTarget(item)
    if (item?.ownerId) navigate(`/users/${item.ownerId}`)
  }, [navigate])

  const closeRoutedOverlay = useCallback((fallback = '/') => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate])

  const selectRoutedChatRoom = useCallback(async room => {
    if (USE_API) await chatData.selectRoom?.(room)
    else setActiveChatRoom(room)
    navigate(`/chats/${room.id}`)
  }, [chatData, navigate, setActiveChatRoom])

  const setRoutedActiveChatRoom = useCallback(room => {
    setActiveChatRoom(room)
    if (room == null && location.pathname.startsWith('/chats/')) {
      navigate('/chats')
    }
  }, [location.pathname, navigate, setActiveChatRoom])

  useEffect(() => {
    if (!roomRouteId || String(chatData.activeRoom?.id) === roomRouteId) return
    const room = chats.find(entry => String(entry.id) === roomRouteId)
    if (room) chatData.selectRoom?.(room)
  }, [chatData, chats, roomRouteId])

  useEffect(() => {
    if (authStatus === 'checking') return
    if (!isLoggedIn) {
      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true,
          state: { from: `${location.pathname}${location.search}` },
        })
      }
      return
    }
    if (!isAdminPath && !isProfileComplete) {
      if (location.pathname !== '/profile/setup') {
        const requestedPath = location.pathname === '/login'
          ? location.state?.from
          : `${location.pathname}${location.search}`
        navigate('/profile/setup', {
          replace: true,
          state: { from: requestedPath || '/' },
        })
      }
      return
    }
    const knownPath = location.pathname === '/'
      || location.pathname === '/login'
      || location.pathname === '/profile/setup'
      || location.pathname === '/search'
      || location.pathname === '/chats'
      || location.pathname === '/my'
      || location.pathname === '/rentals'
      || /^\/items\/\d+$/.test(location.pathname)
      || /^\/chats\/\d+$/.test(location.pathname)
      || /^\/users\/\d+$/.test(location.pathname)
      || isAdminPath
    if (location.pathname === '/login' || location.pathname === '/profile/setup') {
      navigate(location.state?.from || '/', { replace: true })
    } else if (!knownPath) {
      navigate('/', { replace: true })
    }
  }, [
    authStatus,
    isAdminPath,
    isLoggedIn,
    isProfileComplete,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ])

  useEffect(() => {
    if (activeTab === 'rentals' && USE_API && isLoggedIn) reloadRentals?.()
  }, [activeTab, isLoggedIn, reloadRentals])

  useEffect(() => subscribeUnauthorized(() => {
    clearSession()
    setChats([])
    clearNotifications()
    setActiveChatRoom(null)
    navigate('/login', { replace: true })
  }), [clearNotifications, clearSession, navigate, setActiveChatRoom])

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
      } finally {
        if (!ignore) setChatRoomsLoaded(true)
      }
    }

    loadApiData()

    return () => {
      ignore = true
    }
  }, [accessToken, isAdminPath, isLoggedIn, toast])

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
    try {
      await auth.completeProfile()
      const requestedPath = location.state?.from
      navigate(typeof requestedPath === 'string' ? requestedPath : '/', { replace: true })
    } catch (error) {
      toast.error(error.message || '회원 정보를 저장하지 못했습니다.')
    }
  }

  const handleLogout = async () => {
    try {
      await auth.logout()
    } finally {
      setChats([])
      clearNotifications()
      setActiveChatRoom(null)
      navigate('/login', { replace: true })
    }
  }

  if (USE_API && authStatus === 'checking') {
    return <main>로그인 상태 확인 중...</main>
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={auth.login} universities={universities} />
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
            <NotificationBell
              notifications={notifications}
              onMarkRead={markNotificationRead}
              onMarkAllRead={markAllNotificationsRead}
              onError={error => toast.error(error.message || '알림 읽음 처리에 실패했습니다.')}
            />
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
              setSelectedItem={openItem}
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
              setSelectedItem={openItem}
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
              setActiveChatRoom={setRoutedActiveChatRoom}
              selectChatRoom={selectRoutedChatRoom}
              setSelectedItem={openItem}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendMessage={handleSendMessage}
              chats={chats}
              loadingMessages={chatData.loadingMessages}
              messageError={chatData.messageError}
              retryMessage={chatData.retry}
            />
          )}

          {/* TAB 4: MY PAGE */}
          {activeTab === 'my' && (
            <MyPage
              memberName={memberName}
              memberDepartment={memberDepartment}
              popularItems={USE_API ? [] : popularItems}
              setSelectedItem={openItem}
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
          setIsWriteModalOpen={open => {
            if (open) itemEditor.openCreate()
            setIsWriteModalOpen(open)
          }}
          chats={chats}
        />

        {/* --- MODALS & DRAWERS --- */}

        {itemRouteId && !selectedItem && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white p-6">
            {itemData.loading ? (
              <p role="status" className="text-sm font-bold text-slate-500">
                물품을 불러오는 중...
              </p>
            ) : (
              <div role="alert" className="text-center">
                <p className="font-bold text-slate-800">물품을 찾을 수 없습니다.</p>
                <button
                  type="button"
                  onClick={() => navigate('/', { replace: true })}
                  className="mt-4 text-sm font-bold text-indigo-600"
                >
                  홈으로 돌아가기
                </button>
              </div>
            )}
          </div>
        )}

        {roomRouteId && !activeChatRoom && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white p-6">
            {!chatRoomsLoaded ? (
              <p role="status" className="text-sm font-bold text-slate-500">
                채팅방을 불러오는 중...
              </p>
            ) : (
              <div role="alert" className="text-center">
                <p className="font-bold text-slate-800">채팅방을 찾을 수 없습니다.</p>
                <button
                  type="button"
                  onClick={() => navigate('/chats', { replace: true })}
                  className="mt-4 text-sm font-bold text-indigo-600"
                >
                  채팅 목록으로
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. ITEM DETAIL DRAWER/SHEET */}
        {selectedItem && (
          <ProductDetailPage
            item={selectedItem}
            onClose={() => {
              setProfileTarget(null)
              setSelectedItem(null)
              closeRoutedOverlay('/')
            }}
            isOwner={Boolean(savedUser?.id && selectedItem.ownerId === savedUser.id)}
            onOwnerProfile={openProfile}
            onEdit={(item) => {
              itemEditor.openEdit(item)
              setSelectedItem(null)
              setIsWriteModalOpen(true)
              navigate('/', { replace: true })
            }}
            onDelete={async itemId => {
              try {
                await itemData.remove(itemId)
                setSelectedItem(null)
                navigate('/', { replace: true })
                toast.success('물품이 삭제되었습니다.')
              } catch (error) {
                toast.error(error.message || '물품을 삭제하지 못했습니다.')
              }
            }}
            onRental={async () => {
              try {
                const room = normalizeChatRoom(
                  await createOrGetChatRoom(selectedItem.id, accessToken),
                )
                setRentalRequest({ item: selectedItem, chatRoomId: room.roomId || room.id })
                setSelectedItem(null)
                navigate('/', { replace: true })
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
                  await removeWishlist(item.id, accessToken)
                } else {
                  await addWishlist(item.id, accessToken)
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
                  navigate(`/chats/${apiRoom.id}`)
                  setSelectedItem(null)
                  return
                } catch (error) {
                  toast.error(error.message || '채팅방을 만들지 못했습니다.')
                  return
                }
              }

              const existingChat = chats.find(c => c.sender === selectedItem.owner.split(' ')[0])
              let targetRoom = existingChat
              if (targetRoom) {
                setActiveChatRoom(targetRoom)
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
                targetRoom = newRoom
              }
              navigate(targetRoom?.id ? `/chats/${targetRoom.id}` : '/chats')
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
            onBack={() => {
              setProfileTarget(null)
              closeRoutedOverlay('/')
            }}
            onSelectItem={item => {
              openItem(item)
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
          handleCreateItem={itemEditor.submit}
          newType={itemEditor.newType}
          setNewType={itemEditor.setNewType}
          newPhotos={itemEditor.newPhotos}
          handlePhotoSelect={itemEditor.handlePhotoSelect}
          handlePhotoRemove={itemEditor.handlePhotoRemove}
          newTitle={itemEditor.newTitle}
          setNewTitle={itemEditor.setNewTitle}
          newPrice={itemEditor.newPrice}
          setNewPrice={itemEditor.setNewPrice}
          newPriceType={itemEditor.newPriceType}
          setNewPriceType={itemEditor.setNewPriceType}
          newPickupLocationId={itemEditor.newPickupLocationId}
          setNewPickupLocationId={itemEditor.setNewPickupLocationId}
          pickupLocations={pickupLocations}
          newDescription={itemEditor.newDescription}
          setNewDescription={itemEditor.setNewDescription}
          isSubmittingItem={itemEditor.isSubmittingItem}
          editingItemId={itemEditor.editingItemId}
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

export default MarketplaceLayout
