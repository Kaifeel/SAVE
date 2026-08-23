export function createDemoNotifications() {
  return [
    {
      id: 1,
      title: '대여 수락 알림',
      text: '이영희님이 우산 대여를 수락하셨습니다.',
      time: '5분 전',
      read: false,
    },
    {
      id: 2,
      title: '채팅 메시지',
      text: '정수민: 대여료 1000원 계좌이체...',
      time: '어제',
      read: true,
    },
  ]
}
