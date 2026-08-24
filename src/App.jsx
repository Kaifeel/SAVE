import { useState, useEffect, useCallback } from 'react'
import ActivePage from './components/ActivePage.jsx'
import AppFrame from './components/AppFrame.jsx'
import AppOverlays from './components/AppOverlays.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfileSetupPage from './pages/ProfileSetupPage.jsx'
import AdminPage, { AdminAccessDenied } from './pages/AdminPage.jsx'
import { INITIAL_ITEMS } from './data/items.js'
import { createDemoChats } from './data/demoChats.js'
import { createDemoNotifications } from './data/demoNotifications.js'
import { subscribeUnauthorized } from './api/client.js'
import { isAutoLoginEnabled, USE_API } from './config/runtime.js'
import { useReferenceData } from './hooks/useReferenceData.js'
import { useItems } from './hooks/useItems.js'
import { useRentals } from './hooks/useRentals.js'
import { useMyPageData } from './hooks/useMyPageData.js'
import { useRecommendations } from './hooks/useRecommendations.js'
import { useItemEditor } from './hooks/useItemEditor.js'
import { useAppNotifications } from './hooks/useAppNotifications.js'
import { useAppSession } from './hooks/useAppSession.js'
import { useItemActions } from './hooks/useItemActions.js'
import { useReportFlow } from './hooks/useReportFlow.js'
import { useMarketplaceCatalog } from './hooks/useMarketplaceCatalog.js'
import { useAppChats } from './hooks/useAppChats.js'
import { useSharedItemRoute } from './hooks/useSharedItemRoute.js'
import { useToast } from './components/toast.js'
import { clearSharedItemId, shareItem } from './utils/itemShare.js'

const DEV_AUTO_LOGIN = isAutoLoginEnabled(USE_API, import.meta.env.VITE_AUTO_LOGIN)
function App() {
  const toast = useToast()
  const isAdminPath = window.location.pathname === '/admin'
    || window.location.pathname.startsWith('/admin/')
  const [activeTab, setActiveTab] = useState('home') // home, search, chat, my
  const session = useAppSession({ apiEnabled: USE_API, devAutoLogin: DEV_AUTO_LOGIN, toast })
  const {
    accessToken, user: savedUser, authStatus, isLoggedIn, isProfileComplete,
  } = session
  const memberName = session.member.name
  const memberDepartment = session.member.department
  const memberUniversityId = session.member.universityId
  const clearSessionState = session.clear
  const {
    universities, pickupLocations, error: referenceError,
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

  const [selectedItem, setSelectedItem] = useState(null)
  const [profileTarget, setProfileTarget] = useState(null)
  const [rentalRequest, setRentalRequest] = useState(null)
  const reportFlow = useReportFlow({ accessToken, apiEnabled: USE_API, toast })
  const itemEditor = useItemEditor({
    apiEnabled: USE_API, itemData, pickupLocations, university,
    setItems, setSelectedItem, toast,
  })

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
  const chatData = useAppChats({
    accessToken,
    currentUserId: savedUser?.id,
    apiEnabled: USE_API,
    enabled: USE_API && isLoggedIn && !isAdminPath,
    realtime: USE_API && !isAdminPath,
    initialChats: USE_API ? [] : createDemoChats(),
    onNotification: appNotifications.receive,
    toast,
  })
  const { chats, setChats, chatInput, setChatInput } = chatData
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
  const catalog = useMarketplaceCatalog({
    items,
    apiEnabled: USE_API,
    memberUniversityId,
    university,
    recommendedItems: recommendationData.current?.items || [],
  })
  const {
    searchQuery, setSearchQuery, activeBoard, setActiveBoard,
    availableOnly, setAvailableOnly, filteredItems, recommendItems,
    popularItems, homePopularItems, recentItems,
  } = catalog
  const handleSharedItemError = useCallback(message => toast.error(message), [toast])
  useSharedItemRoute({
    enabled: isLoggedIn && isProfileComplete && !isAdminPath,
    apiEnabled: USE_API,
    accessToken,
    items,
    onSelect: setSelectedItem,
    onError: handleSharedItemError,
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
  }), [clearNotifications, clearSessionState, setActiveChatRoom, setChats])

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
    searchQuery, setSearchQuery, recommendItems, setSelectedItem,
    homePopularItems, setActiveTab, recentItems, filteredItems,
    recommendationHeadline: recommendationData.current?.headline,
    recommendationError: recommendationData.error,
    onRefreshRecommendations: recommendationData.refresh,
  }
  const searchProps = {
    activeBoard, setActiveBoard, searchQuery, setSearchQuery,
    availableOnly, setAvailableOnly, filteredItems, setSelectedItem,
    loading: itemData.loading,
    error: itemData.error || referenceError,
    onRetry: itemData.error ? itemData.reload : undefined,
  }
  const chatProps = {
    activeChatRoom, items, setActiveChatRoom,
    selectChatRoom: USE_API ? chatData.selectRoom : setActiveChatRoom,
    setSelectedItem, chatInput, setChatInput,
    handleSendMessage: chatData.sendMessage,
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
    memberName, memberDepartment,
    popularItems: USE_API ? [] : popularItems,
    setSelectedItem,
    recommendItems: USE_API ? [] : recommendItems,
    onLogout: handleLogout,
    onOpenRentals: () => setActiveTab('rentals'),
    data: myPageData,
  }
  const rentalProps = {
    data: rentalData,
    items,
    onBack: () => setActiveTab('my'),
    onError: message => toast.error(message),
  }
  const itemDetailProps = {
    item: selectedItem,
    onClose: () => {
      clearSharedItemId()
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
    onShare: async item => {
      try {
        const result = await shareItem(item)
        if (result === 'copied') toast.success('게시글 링크를 복사했습니다.')
      } catch (error) {
        toast.error(error.message || '게시글을 공유하지 못했습니다.')
      }
    },
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
    target: reportFlow.target, reason: reportFlow.reason,
    setReason: reportFlow.setReason, isSubmitting: reportFlow.isSubmitting,
    onClose: reportFlow.close, onSubmit: reportFlow.submit,
  }
  const itemEditorProps = {
    isOpen: itemEditor.isOpen, handleCreateItem: itemEditor.submit,
    newType: itemEditor.fields.type, setNewType: itemEditor.setters.setType,
    newPhotos: itemEditor.fields.photos, handlePhotoSelect: itemEditor.selectPhotos,
    handlePhotoRemove: itemEditor.removePhoto,
    newTitle: itemEditor.fields.title, setNewTitle: itemEditor.setters.setTitle,
    newPrice: itemEditor.fields.price, setNewPrice: itemEditor.setters.setPrice,
    newPriceType: itemEditor.fields.priceType, setNewPriceType: itemEditor.setters.setPriceType,
    newPickupLocationId: itemEditor.fields.pickupLocationId,
    setNewPickupLocationId: itemEditor.setters.setPickupLocationId,
    pickupLocations,
    newDescription: itemEditor.fields.description, setNewDescription: itemEditor.setters.setDescription,
    isSubmittingItem: itemEditor.isSubmitting, editingItemId: itemEditor.editingItemId,
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
