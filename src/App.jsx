import { useState, useMemo, useEffect, useCallback } from 'react'
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
import { createDemoChats } from './data/demoChats.js'
import { createDemoNotifications } from './data/demoNotifications.js'
import { createOrGetChatRoom, getChatRooms } from './api/chats.js'
import { createReport } from './api/reports.js'
import {
  normalizeChatRoom,
  mergeChatListUpdate,
  mergeChatRoomSnapshot,
} from './api/normalizers.js'
import { subscribeUnauthorized } from './api/client.js'
import { isAutoLoginEnabled, USE_API } from './config/runtime.js'
import { useReferenceData } from './hooks/useReferenceData.js'
import { useItems } from './hooks/useItems.js'
import { useChatRooms } from './hooks/useChatRooms.js'
import { useRentals } from './hooks/useRentals.js'
import { useMyPageData } from './hooks/useMyPageData.js'
import { useRecommendations } from './hooks/useRecommendations.js'
import { useItemEditor } from './hooks/useItemEditor.js'
import { useAppNotifications } from './hooks/useAppNotifications.js'
import { useAppSession } from './hooks/useAppSession.js'
import RentalRequestForm from './components/RentalRequestForm.jsx'
import ReportModal from './components/ReportModal.jsx'
import { addWishlist, removeWishlist } from './api/wishlist.js'
import { useToast } from './components/toast.js'
import { availableItems } from './utils/itemVisibility.js'
import {
  MapPin,
  Bell,
} from 'lucide-react'

const DEV_AUTO_LOGIN = isAutoLoginEnabled(USE_API, import.meta.env.VITE_AUTO_LOGIN)
function App() {
  const toast = useToast()
  const isAdminPath = window.location.pathname === '/admin'
    || window.location.pathname.startsWith('/admin/')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBoard, setActiveBoard] = useState('borrow')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('home') // home, search, chat, my
  const session = useAppSession({
    apiEnabled: USE_API,
    devAutoLogin: DEV_AUTO_LOGIN,
    toast,
  })
  const {
    accessToken,
    user: savedUser,
    authStatus,
    isLoggedIn,
    isProfileComplete,
  } = session
  const memberName = session.member.name
  const memberDepartment = session.member.department
  const memberUniversityId = session.member.universityId
  const clearSessionState = session.clear
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
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  
  const [rentalRequest, setRentalRequest] = useState(null)
  const itemEditor = useItemEditor({
    apiEnabled: USE_API,
    itemData,
    pickupLocations,
    university,
    setItems,
    setSelectedItem,
    toast,
  })

  // Chat tab mock states
  const [chats, setChats] = useState(() => (
    USE_API ? [] : createDemoChats()
  ))
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
  const appNotifications = useAppNotifications({
    accessToken,
    enabled: USE_API && isLoggedIn && isProfileComplete && !isAdminPath,
    initialNotifications: USE_API ? [] : createDemoNotifications(),
    reloadItems,
    reloadRentals,
    reloadMyPage,
    toast,
  })
  const clearNotifications = appNotifications.clear
  const chatData = useChatRooms({
    accessToken,
    currentUserId: savedUser?.id,
    realtime: USE_API && !isAdminPath,
    onChatListUpdate: handleChatListUpdate,
    onRoomRead: handleChatRoomRead,
    onNotification: appNotifications.receive,
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
    clearSessionState()
    setChats([])
    clearNotifications()
    setActiveChatRoom(null)
    setActiveTab('home')
  }), [clearNotifications, clearSessionState, setActiveChatRoom])

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

  const handleLogout = async () => {
    try {
      await session.logout()
    } finally {
      setChats([])
      clearNotifications()
      setActiveChatRoom(null)
      setActiveTab('home')
    }
  }

  if (USE_API && authStatus === 'checking') {
    return <main>로그인 상태 확인 중...</main>
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={session.login} universities={universities} />
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
        setMemberName={session.memberSetters.setName}
        memberDepartment={memberDepartment}
        setMemberDepartment={session.memberSetters.setDepartment}
        memberUniversityId={memberUniversityId}
        setMemberUniversityId={session.memberSetters.setUniversityId}
        universities={universities}
        onComplete={session.completeProfile}
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
                onClick={() => appNotifications.setIsOpen(!appNotifications.isOpen)}
                aria-label="알림 열기"
                aria-expanded={appNotifications.isOpen}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell className="w-6 h-6" />
                {appNotifications.notifications.some(n => !n.read) && (
                  <span aria-label="읽지 않은 알림 있음" className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {appNotifications.isOpen && (
                <div role="dialog" aria-label="알림 목록" className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl py-3 z-[100] max-h-96 overflow-y-auto">
                  <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">알림</span>
                    <button 
                      onClick={appNotifications.markAllRead}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      모두 읽음
                    </button>
                  </div>
                  {appNotifications.notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-400">새로운 알림이 없습니다.</div>
                  ) : (
                    appNotifications.notifications.map(n => (
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
          setIsWriteModalOpen={open => open ? itemEditor.openCreate() : itemEditor.close()}
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
            onEdit={itemEditor.openEdit}
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
            refreshKey={appNotifications.workflowRefreshVersion}
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
          isOpen={itemEditor.isOpen}
          handleCreateItem={itemEditor.submit}
          newType={itemEditor.fields.type}
          setNewType={itemEditor.setters.setType}
          newPhotos={itemEditor.fields.photos}
          handlePhotoSelect={itemEditor.selectPhotos}
          handlePhotoRemove={itemEditor.removePhoto}
          newTitle={itemEditor.fields.title}
          setNewTitle={itemEditor.setters.setTitle}
          newPrice={itemEditor.fields.price}
          setNewPrice={itemEditor.setters.setPrice}
          newPriceType={itemEditor.fields.priceType}
          setNewPriceType={itemEditor.setters.setPriceType}
          newPickupLocationId={itemEditor.fields.pickupLocationId}
          setNewPickupLocationId={itemEditor.setters.setPickupLocationId}
          pickupLocations={pickupLocations}
          newDescription={itemEditor.fields.description}
          setNewDescription={itemEditor.setters.setDescription}
          isSubmittingItem={itemEditor.isSubmitting}
          editingItemId={itemEditor.editingItemId}
          onClose={itemEditor.close}
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
