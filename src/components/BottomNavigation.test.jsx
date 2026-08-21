import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BottomNavigation from './BottomNavigation.jsx'

function CurrentPath() {
  return <output aria-label="current path">{useLocation().pathname}</output>
}

afterEach(cleanup)

function renderNavigation(overrides = {}) {
  const props = {
    activeTab: 'home',
    setActiveTab: vi.fn(),
    setActiveChatRoom: vi.fn(),
    setIsWriteModalOpen: vi.fn(),
    chats: [],
    ...overrides,
  }

  render(
    <MemoryRouter initialEntries={['/']}>
      <BottomNavigation {...props} />
      <CurrentPath />
    </MemoryRouter>,
  )
  return props
}

describe('BottomNavigation', () => {
  it('탐색 링크를 누르면 URL을 /search로 변경한다', async () => {
    renderNavigation()

    await userEvent.click(screen.getByRole('link', { name: '탐색' }))

    expect(screen.getByLabelText('current path')).toHaveTextContent('/search')
  })

  it('글쓰기는 라우트를 바꾸지 않고 작성 모달을 연다', async () => {
    const props = renderNavigation()

    await userEvent.click(screen.getByRole('button', { name: '글쓰기' }))

    expect(props.setIsWriteModalOpen).toHaveBeenCalledWith(true)
    expect(screen.getByLabelText('current path')).toHaveTextContent('/')
  })

  it('읽지 않은 채팅이 있으면 채팅 링크에 표시한다', () => {
    renderNavigation({ chats: [{ id: 1, unread: true }] })

    expect(screen.getByRole('link', { name: '채팅' }))
      .toHaveAttribute('data-unread', 'true')
  })
})
