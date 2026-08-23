import { useState, useMemo, useEffect, useCallback } from 'react'
import ActivePage from './components/ActivePage.jsx'
import AppFrame from './components/AppFrame.jsx'
import AppOverlays from './components/AppOverlays.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfileSetupPage from './pages/ProfileSetupPage.jsx'
import AdminPage, { AdminAccessDenied } from './pages/AdminPage.jsx'
import { INITIAL_ITEMS } from './data/items.js'
import { createDemoChats } from './data/demoChats.js'
import { createDemoNotifications } from './data/demoNotifications.js'
import { getChatRooms } from './api/chats.js'
import {
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
import { useItemActions } from './hooks/useItemActions.js'
import { useReportFlow } from './hooks/useReportFlow.js'
import { useToast } from './components/toast.js'
import { availableItems } from './utils/itemVisibility.js'

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
  const [rentalRequest, setRentalRequest] = useState(null)
  const reportFlow = useReportFlow({ accessToken, apiEnabled: USE_API, toast })
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
  const itemActions = useItemActions({
    accessToken,
    apiEnabled: USE_API,
    selectedItem,
    setSelectedItem,
    setItems,
    itemData,
    chatData,
    chats,
    setChats,
    setActiveChatRoom: chatData.setActiveRoom,
    setActiveTab,
    setRentalRequest,
    toast,
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

  const homeProps = {
    searchQuery,
    setSearchQuery,
    recommendItems,
    setSelectedItem,
    homePopularItems,
    setActiveTab,
    recentItems,
    filteredItems,
    recommendationHeadline: recommendationData.current?.headline,
    recommendationError: recommendationData.error,
    onRefreshRecommendations: recommendationData.refresh,
  }
  const searchProps = {
    activeBoard,
    setActiveBoard,
    searchQuery,
    setSearchQuery,
    availableOnly,
    setAvailableOnly,
    filteredItems,
    setSelectedItem,
    loading: itemData.loading,
    error: itemData.error || referenceError,
    onRetry: itemData.error ? itemData.reload : undefined,
  }
  const chatProps = {
    activeChatRoom,
    items,
    setActiveChatRoom,
    selectChatRoom: USE_API ? chatData.selectRoom : setActiveChatRoom,
    setSelectedItem,
    chatInput,
    setChatInput,
    handleSendMessage,
    chats,
    loadingMessages: chatData.loadingMessages,
    loadingOlder: chatData.loadingOlder,
    hasOlder: chatData.hasOlder,
    loadOlder: chatData.loadOlder,
    messageError: chatData.messageError,
    retryMessage: chatData.retry,
    socketState: USE_API ? chatData.socketState : undefined,
  }
  const myProps = {
    memberName,
    memberDepartment,
    popularItems: USE_API ? [] : popularItems,
    setSelectedItem,
    recommendItems: USE_API ? [] : recommendItems,
    onLogout: handleLogout,
    onOpenRentals: () => setActiveTab('rentals'),
    data: myPageData,
  }
  const rentalProps = {
    data: rentalData,
    onBack: () => setActiveTab('my'),
    onError: message => toast.error(message),
  }
  const itemDetailProps = {
    item: selectedItem,
    onClose: () => {
      setProfileTarget(null)
      setSelectedItem(null)
    },
    isOwner: Boolean(savedUser?.id && selectedItem?.ownerId === savedUser.id),
    onOwnerProfile: setProfileTarget,
    onEdit: itemEditor.openEdit,
    onDelete: itemActions.deleteItem,
    onRental: itemActions.prepareRental,
    onToggleWishlist: itemActions.toggleWishlist,
    onReport: reportFlow.open,
    onChat: itemActions.openChat,
  }
  const profileProps = {
    target: profileTarget,
    userId: profileTarget?.ownerId,
    accessToken,
    enabled: USE_API,
    refreshKey: appNotifications.workflowRefreshVersion,
    fallbackItems: items.filter(item => profileTarget?.ownerId
      ? item.ownerId === profileTarget.ownerId
      : item.owner === profileTarget?.owner),
    onBack: () => setProfileTarget(null),
    onSelectItem: item => {
      setSelectedItem(item)
      setProfileTarget(null)
    },
    canReport: !savedUser?.id || profileTarget?.ownerId !== savedUser.id,
    onReport: () => {
      setProfileTarget(null)
      reportFlow.open(profileTarget)
    },
  }
  const reportProps = {
    target: reportFlow.target,
    reason: reportFlow.reason,
    setReason: reportFlow.setReason,
    isSubmitting: reportFlow.isSubmitting,
    onClose: reportFlow.close,
    onSubmit: reportFlow.submit,
  }
  const itemEditorProps = {
    isOpen: itemEditor.isOpen,
    handleCreateItem: itemEditor.submit,
    newType: itemEditor.fields.type,
    setNewType: itemEditor.setters.setType,
    newPhotos: itemEditor.fields.photos,
    handlePhotoSelect: itemEditor.selectPhotos,
    handlePhotoRemove: itemEditor.removePhoto,
    newTitle: itemEditor.fields.title,
    setNewTitle: itemEditor.setters.setTitle,
    newPrice: itemEditor.fields.price,
    setNewPrice: itemEditor.setters.setPrice,
    newPriceType: itemEditor.fields.priceType,
    setNewPriceType: itemEditor.setters.setPriceType,
    newPickupLocationId: itemEditor.fields.pickupLocationId,
    setNewPickupLocationId: itemEditor.setters.setPickupLocationId,
    pickupLocations,
    newDescription: itemEditor.fields.description,
    setNewDescription: itemEditor.setters.setDescription,
    isSubmittingItem: itemEditor.isSubmitting,
    editingItemId: itemEditor.editingItemId,
    onClose: itemEditor.close,
  }
  const rentalRequestProps = {
    request: rentalRequest,
    onClose: () => setRentalRequest(null),
    onSubmit: async payload => {
      try {
        await rentalData.create(payload)
        setRentalRequest(null)
        toast.success('대여 요청을 보냈습니다.')
      } catch (error) {
        toast.error(error.message || '대여 요청에 실패했습니다.')
      }
    },
  }

  return (
    <AppFrame
      headerProps={{
        university,
        notifications: appNotifications.notifications,
        notificationOpen: appNotifications.isOpen,
        onToggleNotifications: () => appNotifications.setIsOpen(!appNotifications.isOpen),
        onMarkAllRead: appNotifications.markAllRead,
      }}
      navigationProps={{
        activeTab,
        setActiveTab,
        setActiveChatRoom,
        setIsWriteModalOpen: open => open ? itemEditor.openCreate() : itemEditor.close(),
        chats,
      }}
      chatDetailOpen={activeTab === 'chat' && Boolean(activeChatRoom)}
      overlays={(
        <AppOverlays
          itemDetail={itemDetailProps}
          profile={profileProps}
          report={reportProps}
          itemEditor={itemEditorProps}
          rentalRequest={rentalRequestProps}
        />
      )}
    >
      <ActivePage
        activeTab={activeTab}
        homeProps={homeProps}
        searchProps={searchProps}
        chatProps={chatProps}
        myProps={myProps}
        rentalProps={rentalProps}
      />
    </AppFrame>
  )
}

export default App
