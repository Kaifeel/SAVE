export function createDemoChats() {
  return [
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
        { id: 6, sender: 'me', text: '저 다와가요. 3분 안에 도착합니다.', time: '오후 4:11' },
      ],
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
        { id: 4, sender: 'other', text: '대여료 1000원 계좌이체 해드렸습니다! 확인 부탁드려요.', time: '어제 오후 3:00' },
      ],
    },
  ]
}
