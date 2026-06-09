import { useState, useMemo } from 'react'
import {
  MapPin,
  Bell,
  Search,
  ChevronRight,
  Star,
  Laptop,
  BookOpen,
  Trophy,
  Tent,
  Shirt,
  Wrench,
  Plus,
  MessageSquare,
  User,
  Home,
  Camera,
  Umbrella,
  Plug,
  Calculator,
  PenTool,
  ArrowLeft,
  Send,
  CheckCircle,
  X,
  Sparkles,
  Info,
  Image as ImageIcon
} from 'lucide-react'

// Initial list of items combining Image 1, Image 2, and extra detailed mockup items
const INITIAL_ITEMS = [
  // Section 1: 오늘의 AI 추천 물품 (비 오는 날 우산이 없으신가요?)
  {
    id: 1,
    title: '우산 (장우산)',
    price: 1000,
    priceType: '일',
    location: '누리관 앞',
    category: '기타',
    badge: '인기',
    section: 'recommend',
    university: '부경대학교',
    rating: 4.8,
    reviews: 12,
    owner: '이영희 (IT학부)',
    description: '크고 튼튼한 장우산입니다. 비가 많이 와도 젖지 않아요. 반납은 누리관 앞에 부탁드립니다.',
    imageIcon: Umbrella,
    iconColor: 'text-sky-500 bg-sky-50',
    status: 'available'
  },
  {
    id: 2,
    title: '우산 (접이식 3단)',
    price: 2000,
    priceType: '일',
    location: '도서관 앞',
    category: '기타',
    badge: '신규',
    section: 'recommend',
    university: '부경대학교',
    rating: 4.5,
    reviews: 4,
    owner: '김철수 (경영학과)',
    description: '가볍게 휴대하기 좋은 3단 접이식 우산입니다. 도서관 사물함 앞에서 전달 가능합니다.',
    imageIcon: Umbrella,
    iconColor: 'text-indigo-500 bg-indigo-50',
    status: 'available'
  },
  // Section 2: 인기 대여 물품
  {
    id: 3,
    title: '캐논 EOS M50 카메라',
    price: 15000,
    priceType: '일',
    location: '공학관 앞',
    category: '전자기기',
    badge: '인기',
    section: 'popular',
    university: '부경대학교',
    rating: 4.9,
    reviews: 28,
    owner: '박지민 (미디어컴학부)',
    description: '유튜브 촬영 및 스냅 사진용으로 최적인 미러리스 카메라입니다. 렌즈(15-45mm)와 배터리 2개, SD카드가 포함되어 있어 바로 촬영 가능합니다.',
    imageIcon: Camera,
    iconColor: 'text-rose-500 bg-rose-50',
    status: 'available'
  },
  {
    id: 4,
    title: '텐트 (원터치 4인용)',
    price: 20000,
    priceType: '일',
    location: '생활관 B동',
    category: '캠핑',
    badge: '신규',
    section: 'popular',
    university: '부경대학교',
    rating: 4.7,
    reviews: 14,
    owner: '최준호 (체육학과)',
    description: '던지면 2초만에 펴지는 편리한 원터치 텐트입니다. 돗자리와 미니 랜턴도 함께 빌려드립니다.',
    imageIcon: Tent,
    iconColor: 'text-emerald-500 bg-emerald-50',
    status: 'available'
  },
  {
    id: 5,
    title: 'USB C타입 고속 충전기',
    price: 1000,
    priceType: '일',
    location: '청운관 1열람실',
    category: '전자기기',
    badge: '인기',
    section: 'popular',
    university: '부경대학교',
    rating: 4.9,
    reviews: 35,
    owner: '정수민 (전기공학과)',
    description: '65W 초고속 충전이 가능한 어댑터와 C to C 케이블입니다. 청운관 1열람실 안에서 대여 및 반납 원합니다.',
    imageIcon: Plug,
    iconColor: 'text-amber-500 bg-amber-50',
    status: 'available'
  },
  {
    id: 6,
    title: '공학용 계산기 (TI-84)',
    price: 2000,
    priceType: '일',
    location: '누리관 앞',
    category: '전자기기',
    badge: '인기',
    section: 'popular',
    university: '부경대학교',
    rating: 4.6,
    reviews: 19,
    owner: '윤도현 (기계공학과)',
    description: '시험 볼 때 필수인 텍사스 인스트루먼트 공학용 계산기입니다. 상태 깨끗하고 리셋된 상태로 드립니다.',
    imageIcon: Calculator,
    iconColor: 'text-cyan-500 bg-cyan-50',
    status: 'available'
  },
  // Section 3: 방금 올라왔어요
  {
    id: 7,
    title: '모나미 검은색 볼펜 구해요',
    price: 0,
    priceType: '무료',
    location: '청운관 2열람실',
    category: '도서/교재',
    badge: '신규',
    section: 'recent',
    type: 'want', // 'want' indicates "구해요", 'rent' indicates "빌려줘요"
    university: '부경대학교',
    rating: 5.0,
    reviews: 1,
    owner: '이서윤 (국문학과)',
    description: '필기구 지갑을 두고 와서 볼펜 한 자루만 잠시 빌려주실 천사 구합니다... 반납할 때 마이쮸 드릴게요!',
    imageIcon: PenTool,
    iconColor: 'text-blue-500 bg-blue-50',
    status: 'available'
  },
  {
    id: 8,
    title: 'C타입 충전기 있으신 분',
    price: 1000,
    priceType: '시간',
    location: '누리관 앞',
    category: '전자기기',
    badge: '신규',
    section: 'recent',
    type: 'want',
    university: '부경대학교',
    rating: 4.3,
    reviews: 3,
    owner: '김태우 (화학공학과)',
    description: '배터리가 2% 남았습니다. 1시간 정도만 누리관 휴게실에서 노트북/폰 충전기 빌려주실 분 찾습니다.',
    imageIcon: Plug,
    iconColor: 'text-amber-500 bg-amber-50',
    status: 'available'
  },
  // Items for 한국대학교
  {
    id: 9,
    title: '캐논 EOS M50 카메라',
    price: 15000,
    priceType: '일',
    location: '공학관 앞',
    category: '전자기기',
    badge: '인기',
    section: 'popular',
    university: '한국대학교',
    rating: 4.9,
    reviews: 28,
    owner: '박혜원 (영상미디어과)',
    description: '유튜브 촬영용 카메라입니다.',
    imageIcon: Camera,
    iconColor: 'text-rose-500 bg-rose-50',
    status: 'available'
  },
  {
    id: 10,
    title: '텐트 (4인용)',
    price: 20000,
    priceType: '일',
    location: '생활관 B동',
    category: '캠핑',
    badge: '신규',
    section: 'popular',
    university: '한국대학교',
    rating: 4.7,
    reviews: 14,
    owner: '김우진 (체육교육과)',
    description: '나들이용 4인용 텐트입니다.',
    imageIcon: Tent,
    iconColor: 'text-emerald-500 bg-emerald-50',
    status: 'available'
  }
]

const CATEGORIES = [
  { name: '전체', icon: Sparkles, color: 'text-purple-600 bg-purple-50' },
  { name: '전자기기', icon: Laptop, color: 'text-blue-600 bg-blue-50' },
  { name: '도서/교재', icon: BookOpen, color: 'text-red-600 bg-red-50' },
  { name: '스포츠', icon: Trophy, color: 'text-emerald-600 bg-emerald-50' },
  { name: '캠핑', icon: Tent, color: 'text-amber-600 bg-amber-50' },
  { name: '의류', icon: Shirt, color: 'text-indigo-600 bg-indigo-50' },
  { name: '공구', icon: Wrench, color: 'text-slate-600 bg-slate-50' }
]

function App() {
  const [university, setUniversity] = useState('부경대학교')
  const [isUnivOpen, setIsUnivOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [activeTab, setActiveTab] = useState('home') // home, search, chat, my
  const [items, setItems] = useState(INITIAL_ITEMS)
  
  // Modals & Sheets
  const [selectedItem, setSelectedItem] = useState(null)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  
  // Custom states for interactive actions
  const [rentRequestSuccess, setRentRequestSuccess] = useState(false)
  const [isSubmittingItem, setIsSubmittingItem] = useState(false)

  // Write item form states
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newPriceType, setNewPriceType] = useState('일')
  const [newLocation, setNewLocation] = useState('')
  const [newCategory, setNewCategory] = useState('전자기기')
  const [newType, setNewType] = useState('rent') // rent (빌려줘요) or want (구해요)
  const [newDescription, setNewDescription] = useState('')

  // Chat tab mock states
  const [chats, setChats] = useState([
    {
      id: 1,
      sender: '이영희',
      itemTitle: '우산 (장우산)',
      lastMessage: '누리관 1층 로비인데, 어디쯤이신가요?',
      time: '오후 4:02',
      unread: true,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
      messages: [
        { id: 1, sender: 'other', text: '안녕하세요! 우산 대여 신청했습니다.', time: '오후 3:45' },
        { id: 2, sender: 'me', text: '네 안녕하세요! 지금 전달 가능합니다.', time: '오후 3:48' },
        { id: 3, sender: 'other', text: '누리관 1층 로비인데, 어디쯤이신가요?', time: '오후 4:02' }
      ]
    },
    {
      id: 2,
      sender: '정수민',
      itemTitle: 'USB C타입 고속 충전기',
      lastMessage: '대여료 1000원 계좌이체 해드렸습니다! 확인 부탁드려요.',
      time: '어제',
      unread: false,
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

  // Filter items based on: Location (Univ), Category, Search Query
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Location Check
      if (item.university !== university) return false

      // Category Check
      if (selectedCategory !== '전체' && item.category !== selectedCategory) return false

      // Search Query Check
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchLoc = item.location.toLowerCase().includes(query)
        const matchCat = item.category.toLowerCase().includes(query)
        return matchTitle || matchLoc || matchCat
      }

      return true
    })
  }, [items, university, selectedCategory, searchQuery])

  // Split into sections
  const recommendItems = useMemo(() => filteredItems.filter(i => i.section === 'recommend'), [filteredItems])
  const popularItems = useMemo(() => filteredItems.filter(i => i.section === 'popular'), [filteredItems])
  const recentItems = useMemo(() => filteredItems.filter(i => i.section === 'recent'), [filteredItems])

  // Handle rental request
  const handleRentRequest = (item) => {
    setRentRequestSuccess(false)
    setTimeout(() => {
      setRentRequestSuccess(true)
      setNotifications(prev => [
        {
          id: Date.now(),
          title: '대여 신청 완료',
          text: `[${item.title}] 대여를 신청했습니다. 대여주인의 수락을 기다리는 중입니다.`,
          time: '방금 전',
          read: false
        },
        ...prev
      ])
      setTimeout(() => {
        setRentRequestSuccess(false)
      }, 3000)
    }, 850)
  }

  // Handle uploading new item
  const handleCreateItem = (e) => {
    e.preventDefault()
    if (!newTitle || !newPrice) return

    setIsSubmittingItem(true)

    // Select dynamic icon based on category
    let SelectedIcon = Sparkles
    let colorClasses = 'text-blue-500 bg-blue-50'

    if (newCategory === '전자기기') {
      SelectedIcon = Laptop
      colorClasses = 'text-blue-500 bg-blue-50'
    } else if (newCategory === '도서/교재') {
      SelectedIcon = BookOpen
      colorClasses = 'text-red-500 bg-red-50'
    } else if (newCategory === '스포츠') {
      SelectedIcon = Trophy
      colorClasses = 'text-emerald-500 bg-emerald-50'
    } else if (newCategory === '캠핑') {
      SelectedIcon = Tent
      colorClasses = 'text-amber-500 bg-amber-50'
    } else if (newCategory === '의류') {
      SelectedIcon = Shirt
      colorClasses = 'text-indigo-500 bg-indigo-50'
    } else if (newCategory === '공구') {
      SelectedIcon = Wrench
      colorClasses = 'text-slate-500 bg-slate-50'
    }

    const newItem = {
      id: Date.now(),
      title: newTitle,
      price: parseInt(newPrice, 10) || 0,
      priceType: newPriceType,
      location: newLocation || '캠퍼스 내',
      category: newCategory,
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
      status: 'available'
    }

    setTimeout(() => {
      setItems(prev => [newItem, ...prev])
      setIsSubmittingItem(false)
      setIsWriteModalOpen(false)
      // Reset form
      setNewTitle('')
      setNewPrice('')
      setNewLocation('')
      setNewDescription('')
      alert('물품이 성공적으로 등록되었습니다!')
    }, 600)
  }

  // Handle sending chat message
  const handleSendMessage = () => {
    if (!chatInput.trim() || !activeChatRoom) return

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      text: chatInput,
      time: '방금 전'
    }

    setChats(prev => prev.map(c => {
      if (c.id === activeChatRoom.id) {
        return {
          ...c,
          lastMessage: chatInput,
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
          {/* Location Selector (Interactive) */}
          <div className="relative">
            <button 
              onClick={() => setIsUnivOpen(!isUnivOpen)}
              className="flex items-center space-x-1 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-all"
            >
              <MapPin className="w-5 h-5 text-indigo-600 fill-indigo-100/60" />
              <span className="text-[17px] font-bold text-slate-800">{university}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
            </button>
            
            {/* University Dropdown */}
            {isUnivOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {['부경대학교', '한국대학교', '부산대학교'].map((univ) => (
                  <button
                    key={univ}
                    onClick={() => {
                      setUniversity(univ)
                      setIsUnivOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors ${
                      university === univ ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-600'
                    }`}
                  >
                    {univ}
                  </button>
                ))}
              </div>
            )}
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
        <main className="flex-1 overflow-y-auto bg-slate-50/50 pb-20">
          
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <div className="animate-in fade-in duration-200">
              
              {/* SEARCH BAR (Image 2 - 캠퍼스 대여소 검색어 입력창) */}
              <div className="px-5 py-3 bg-white">
                <div className="relative flex items-center bg-slate-100 rounded-2xl px-4 py-3 group focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                  <Search className="w-5 h-5 text-slate-400 mr-2 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="빌리고 싶은 물건을 검색하세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[15px] placeholder-slate-400 text-slate-800"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>


              {/* SECTION 1: 오늘의 AI 추천 물품 (Image 2 - 오늘의 AI 추천 물품) */}
              {recommendItems.length > 0 && (
                <div className="mt-4 px-5 py-3">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black tracking-wide px-2 py-0.5 rounded-full uppercase">AI Pick</span>
                    <h2 className="text-[17px] font-black text-slate-800">오늘의 AI 추천 물품</h2>
                  </div>
                  <p className="text-sm text-slate-500 mb-3 flex items-center">
                    <Sparkles className="w-4 h-4 text-indigo-500 mr-1 animate-pulse" />
                    비 오는 날 우산이 없으신가요?
                  </p>
                  
                  <div className="space-y-2.5">
                    {recommendItems.map((item) => {
                      const ItemIcon = item.imageIcon
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-3.5 flex items-center space-x-3.5 cursor-pointer hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                            <ItemIcon className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-800 text-[15px] truncate">{item.title}</h4>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex-shrink-0 ${
                                item.badge === '인기' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
                              }`}>{item.badge}</span>
                            </div>
                            <div className="text-[15px] font-extrabold text-indigo-600 mt-1">
                              {item.price.toLocaleString()}원/{item.priceType}
                            </div>
                            <div className="flex items-center text-xs text-slate-400 mt-1.5 space-x-2">
                              <span className="flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-0.5 text-indigo-400" />
                                {item.location}
                              </span>
                              <span>•</span>
                              <span className="flex items-center">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400 mr-0.5" />
                                {item.rating} ({item.reviews})
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: 인기 대여 물품 (Image 2 - 인기 대여 물품) */}
              {popularItems.length > 0 && (
                <div className="mt-4 px-5 py-3">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[17px] font-black text-slate-800">인기 대여 물품</h2>
                    <button onClick={() => setActiveTab('search')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center">
                      <span>더보기</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {popularItems.slice(0, 4).map((item) => {
                      const ItemIcon = item.imageIcon
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-3 flex flex-col cursor-pointer hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                        >
                          <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-2.5 relative ${item.iconColor}`}>
                            <ItemIcon className="w-9 h-9" />
                            <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm shadow-sm px-2 py-0.5 text-[9px] font-extrabold text-rose-500 rounded-md">
                              {item.badge}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-slate-800 text-sm truncate leading-tight">{item.title}</h4>
                          <div className="text-sm font-extrabold text-indigo-600 mt-1">
                            {item.price.toLocaleString()}원/{item.priceType}
                          </div>
                          
                          <div className="flex items-center text-[10px] text-slate-400 mt-2 space-x-1.5 truncate">
                            <span className="flex items-center truncate">
                              <MapPin className="w-3 h-3 mr-0.5 text-indigo-400" />
                              {item.location}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: 방금 올라왔어요 (Image 2 - 방금 올라왔어요) */}
              {recentItems.length > 0 && (
                <div className="mt-4 px-5 py-3">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[17px] font-black text-slate-800">방금 올라왔어요</h2>
                    <button onClick={() => setActiveTab('search')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center">
                      <span>더보기</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    {recentItems.map((item) => {
                      const ItemIcon = item.imageIcon
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-3 flex items-center space-x-3.5 cursor-pointer hover:shadow-md hover:shadow-indigo-50/50 transition-all"
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative ${item.iconColor}`}>
                            <ItemIcon className="w-6 h-6" />
                            {item.type === 'want' && (
                              <span className="absolute -top-1 -left-1 bg-amber-500 text-white font-bold text-[8px] px-1 rounded-sm">구해요</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-800 text-sm truncate">{item.title}</h4>
                              <span className="text-[10px] text-slate-400 font-medium">방금 전</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm font-extrabold text-indigo-600">
                                {item.price === 0 ? '무료' : `${item.price.toLocaleString()}원/${item.priceType}`}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-0.5 text-indigo-400" />
                                {item.location}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* EMPTY FILTER VIEW */}
              {filteredItems.length === 0 && (
                <div className="py-16 text-center">
                  <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">검색 또는 카테고리에 맞는 물품이 없습니다.</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('전체')
                    }}
                    className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
                  >
                    필터 초기화하기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH */}
          {activeTab === 'search' && (
            <div className="p-5 animate-in fade-in duration-200">
              <h2 className="text-xl font-black text-slate-800 mb-4">물품 탐색</h2>
              
              {/* Search Bar */}
              <div className="relative flex items-center bg-slate-100 rounded-2xl px-4 py-3 mb-4">
                <Search className="w-5 h-5 text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="카테고리, 장소, 물품명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-[15px] placeholder-slate-400 text-slate-800"
                />
              </div>

              {/* Horizontal Category Scroll */}
              <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategory === cat.name
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Combined Grid List */}
              <div className="space-y-3 mt-2">
                {filteredItems.map((item) => {
                  const ItemIcon = item.imageIcon
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                        <ItemIcon className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 text-[15px] truncate">{item.title}</h4>
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md ${
                            item.badge === '인기' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
                          }`}>{item.badge}</span>
                        </div>
                        <div className="text-[15px] font-extrabold text-indigo-600 mt-1">
                          {item.price === 0 ? '무료' : `${item.price.toLocaleString()}원/${item.priceType}`}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[11px] text-slate-400 flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-0.5 text-indigo-400" />
                            {item.location}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                            {item.university}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredItems.length === 0 && (
                  <div className="py-16 text-center">
                    <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">등록된 물품이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHAT */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col animate-in fade-in duration-200">
              {activeChatRoom ? (
                /* Active Chat Room View */
                <div className="flex-1 flex flex-col h-full bg-slate-50">
                  {/* Chat Room Header */}
                  <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center">
                    <button onClick={() => setActiveChatRoom(null)} className="p-1.5 mr-1 hover:bg-slate-100 rounded-full text-slate-600">
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <img src={activeChatRoom.avatar} alt={activeChatRoom.sender} className="w-9 h-9 rounded-full mr-3 object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{activeChatRoom.sender}</h4>
                      <p className="text-[10px] text-slate-400 truncate w-44">물품: {activeChatRoom.itemTitle}</p>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[520px]">
                    <div className="text-center text-[10px] text-slate-400 bg-slate-200/50 rounded-full px-4 py-1.5 w-max mx-auto mb-2">
                      캠퍼스 안전 대여를 위해 카카오톡 대신 SAVE 채팅을 권장합니다.
                    </div>
                    {activeChatRoom.messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'me' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
                        }`}>
                          <p>{msg.text}</p>
                          <span className={`text-[8px] block text-right mt-1 ${msg.sender === 'me' ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input Bar */}
                  <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Chat List View */
                <div className="p-5">
                  <h2 className="text-xl font-black text-slate-800 mb-4">채팅</h2>
                  <div className="space-y-2">
                    {chats.map(chat => (
                      <div
                        key={chat.id}
                        onClick={() => setActiveChatRoom(chat)}
                        className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3.5 cursor-pointer hover:shadow-md transition-shadow relative"
                      >
                        <img src={chat.avatar} alt={chat.sender} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-800 text-sm">{chat.sender}</span>
                            <span className="text-[10px] text-slate-400">{chat.time}</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-indigo-600 px-2 py-0.5 rounded-md mt-1 inline-block font-semibold">
                            {chat.itemTitle}
                          </span>
                          <p className="text-xs text-slate-500 mt-1.5 truncate leading-normal">{chat.lastMessage}</p>
                        </div>
                        {chat.unread && (
                          <span className="absolute top-4 right-4 w-2 h-2 bg-indigo-600 rounded-full"></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MY PAGE */}
          {activeTab === 'my' && (
            <div className="p-5 animate-in fade-in duration-200">
              <h2 className="text-xl font-black text-slate-800 mb-4">내 정보</h2>
              
              {/* Profile Card */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-100">
                  김
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-black text-slate-800 text-lg">김부경</h3>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100">
                      학생 인증 완료
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">부경대학교 공과대학 IT융합학부</p>
                  <p className="text-xs text-indigo-600 font-bold mt-1.5">신뢰 등급: 우수 학생 ★4.9</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 font-bold">대여해준 횟수</span>
                  <p className="text-base font-extrabold text-slate-800 mt-1">12회</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 font-bold">빌려온 횟수</span>
                  <p className="text-base font-extrabold text-slate-800 mt-1">5회</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 font-bold">등록 물품</span>
                  <p className="text-base font-extrabold text-slate-800 mt-1">3개</p>
                </div>
              </div>

              {/* Menu List */}
              <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 overflow-hidden">
                <button className="w-full text-left px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <span>학생증 모바일 인증서 관리</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button className="w-full text-left px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <span>나의 대여 신청 내역</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button className="w-full text-left px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <span>알림 수신 및 관심 캠퍼스 관리</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button className="w-full text-left px-5 py-4 text-sm font-bold text-rose-500 hover:bg-rose-50/20 transition-colors flex justify-between items-center">
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM TAB NAVIGATION BAR */}
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

        {/* --- MODALS & DRAWERS --- */}

        {/* 1. RENTAL CONFIRMATION FLOATING ALERTS */}
        {rentRequestSuccess && (
          <div className="absolute top-16 left-5 right-5 bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-extrabold">대여 신청 완료!</p>
              <p className="text-[10px] text-emerald-100 mt-0.5">대여주인과 매칭되면 대여신청완료 알림이 갑니다.</p>
            </div>
          </div>
        )}

        {/* 2. ITEM DETAIL DRAWER/SHEET */}
        {selectedItem && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end transition-opacity duration-300 animate-in fade-in">
            {/* Modal Overlay Click to Close */}
            <div className="absolute inset-0" onClick={() => setSelectedItem(null)}></div>
            
            {/* Slide up Container */}
            <div className="bg-white rounded-t-[32px] w-full max-h-[90%] overflow-y-auto z-10 p-6 flex flex-col relative animate-in slide-in-from-bottom duration-300">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-5 right-5 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Product Header */}
              <div className="flex items-center space-x-4 mt-2 mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${selectedItem.iconColor}`}>
                  {(() => {
                    const SelectedIcon = selectedItem.imageIcon
                    return <SelectedIcon className="w-8 h-8" />
                  })()}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
                      {selectedItem.category}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                      selectedItem.badge === '인기' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
                    }`}>{selectedItem.badge}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-lg mt-1">{selectedItem.title}</h3>
                </div>
              </div>

              {/* Product Info Table */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-xs mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">대여금액</span>
                  <span className="text-sm font-extrabold text-indigo-600">
                    {selectedItem.price === 0 ? '무료' : `${selectedItem.price.toLocaleString()}원 / ${selectedItem.priceType}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">대여장소</span>
                  <span className="font-bold text-slate-700 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-0.5 text-indigo-500" />
                    {selectedItem.location}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">대여주인</span>
                  <span className="font-bold text-slate-700">{selectedItem.owner}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">등록학교</span>
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                    {selectedItem.university}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-bold text-slate-800 text-sm mb-2">상세 설명</h4>
                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  {selectedItem.description}
                </p>
              </div>

              {/* Map Place Mockup */}
              <div className="mb-6">
                <h4 className="font-bold text-slate-800 text-sm mb-2">거래 장소 지도</h4>
                <div className="w-full h-32 bg-indigo-50 rounded-xl relative overflow-hidden flex flex-col justify-center items-center border border-indigo-100">
                  <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <MapPin className="w-7 h-7 text-indigo-600 fill-indigo-200 animate-bounce" />
                    <span className="mt-1.5 text-xs font-black text-indigo-600 bg-white shadow-sm border border-indigo-100 rounded-md px-2 py-1">
                      {selectedItem.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-auto">
                <button 
                  onClick={() => {
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
                  className="flex-1 py-4 bg-slate-100 text-slate-700 font-extrabold text-sm rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-center"
                >
                  채팅으로 문의
                </button>
                <button 
                  onClick={() => {
                    handleRentRequest(selectedItem)
                    setSelectedItem(null)
                  }}
                  className="flex-2 py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-100 transition-all text-center"
                >
                  대여 신청하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. WRITE MODAL (SLIDE UP) */}
        {isWriteModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end transition-opacity duration-300 animate-in fade-in">
            <div className="absolute inset-0" onClick={() => setIsWriteModalOpen(false)}></div>
            <form 
              onSubmit={handleCreateItem}
              className="bg-white rounded-t-[32px] w-full max-h-[90%] overflow-y-auto z-10 p-6 flex flex-col relative animate-in slide-in-from-bottom duration-300"
            >
              
              <button 
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-slate-800 text-lg mb-5 mt-1">대여 물품 등록</h3>

              {/* Form Content */}
              <div className="space-y-4 text-left">
                {/* Type toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">거래 종류</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewType('rent')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        newType === 'rent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      빌려줄래요 (제공)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType('want')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        newType === 'want' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      빌려주세요 (요청)
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">물품 이름</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 4인용 텐트, USB 고속 충전기 등"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">카테고리</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
                  >
                    {CATEGORIES.filter(c => c.name !== '전체').map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                    <option value="기타">기타</option>
                  </select>
                </div>

                {/* Price & Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">대여 가격</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      required
                      placeholder="대여 가격 (0원 입력 시 무료)"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
                    />
                    <select
                      value={newPriceType}
                      onChange={(e) => setNewPriceType(e.target.value)}
                      className="bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-3 text-xs outline-none transition-all text-slate-800"
                    >
                      <option value="일">일</option>
                      <option value="시간">시간</option>
                      <option value="무료">무료</option>
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">거래 선호 위치</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 청운관 1열람실 사물함 앞, 생활관 B동 입구"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">설명</label>
                  <textarea
                    rows={3}
                    placeholder="물품의 상태, 대여 방법, 반납 방법 등을 작성해 주세요."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs outline-none transition-all text-slate-800 resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-center"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingItem}
                  className="flex-2 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-100 transition-all text-center"
                >
                  {isSubmittingItem ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}

export default App