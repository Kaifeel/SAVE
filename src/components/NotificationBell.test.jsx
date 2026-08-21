import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotificationBell from './NotificationBell.jsx'

afterEach(cleanup)

const notifications = [
  { id: 1, title: '대여 알림', text: '요청이 왔습니다.', time: '방금 전', read: false },
  { id: 2, title: '이전 알림', text: '완료됐습니다.', time: '어제', read: true },
]

describe('NotificationBell', () => {
  it('벨을 누르면 알림 목록과 읽지 않은 표시를 보여준다', async () => {
    render(<NotificationBell notifications={notifications} />)

    await userEvent.click(screen.getByRole('button', { name: '알림 열기' }))

    expect(screen.getByRole('dialog', { name: '알림 목록' })).toBeInTheDocument()
    expect(screen.getByLabelText('읽지 않은 알림 있음')).toBeInTheDocument()
  })

  it('읽지 않은 알림을 누르면 해당 ID의 읽음 동작을 호출한다', async () => {
    const onMarkRead = vi.fn()
    render(<NotificationBell notifications={notifications} onMarkRead={onMarkRead} />)
    await userEvent.click(screen.getByRole('button', { name: '알림 열기' }))

    await userEvent.click(screen.getByRole('button', { name: /대여 알림/ }))

    expect(onMarkRead).toHaveBeenCalledWith(1)
  })

  it('모두 읽음을 누르면 전체 읽음 동작을 호출한다', async () => {
    const onMarkAllRead = vi.fn()
    render(<NotificationBell notifications={notifications} onMarkAllRead={onMarkAllRead} />)
    await userEvent.click(screen.getByRole('button', { name: '알림 열기' }))

    await userEvent.click(screen.getByRole('button', { name: '모두 읽음' }))

    expect(onMarkAllRead).toHaveBeenCalledTimes(1)
  })
})
