import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import AppFrame from './AppFrame.jsx'

afterEach(cleanup)

it('keeps the application frame interactions and navigation accessible', async () => {
  const user = userEvent.setup()
  const onToggleNotifications = vi.fn()
  const onMarkAllRead = vi.fn()
  render(
    <AppFrame
      headerProps={{
        university: '부경대학교',
        notifications: [{
          id: 1,
          title: '대여 알림',
          text: '요청이 도착했습니다.',
          time: '방금 전',
          read: false,
        }],
        notificationOpen: true,
        onToggleNotifications,
        onMarkAllRead,
      }}
      navigationProps={{
        activeTab: 'home',
        setActiveTab: vi.fn(),
        setActiveChatRoom: vi.fn(),
        setIsWriteModalOpen: vi.fn(),
        chats: [],
      }}
      chatDetailOpen={false}
    >
      <section>현재 화면</section>
    </AppFrame>,
  )

  expect(screen.getByText('현재 화면')).toBeInTheDocument()
  expect(screen.getByLabelText('읽지 않은 알림 있음')).toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: '알림 목록' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '알림 열기' })).toHaveAttribute('aria-expanded', 'true')
  expect(['홈', '탐색', '글쓰기', '채팅', '마이'].map(name => (
    screen.getByRole('button', { name })
  ))).toHaveLength(5)

  await user.click(screen.getByRole('button', { name: '알림 열기' }))
  await user.click(screen.getByRole('button', { name: '모두 읽음' }))

  expect(onToggleNotifications).toHaveBeenCalledTimes(1)
  expect(onMarkAllRead).toHaveBeenCalledTimes(1)
})
