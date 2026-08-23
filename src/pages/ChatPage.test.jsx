import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ChatPage from './ChatPage'

afterEach(cleanup)

it('links the active chat header to the item ID instead of a duplicate title', () => {
  const firstItem = {
    id: 1,
    title: 'Same title',
    price: 1000,
    priceType: 'DAY',
    location: 'First location',
  }
  const linkedItem = {
    id: 2,
    title: 'Same title',
    price: 2000,
    priceType: 'DAY',
    location: 'Second location',
  }
  const setSelectedItem = vi.fn()

  render(<ChatPage
    activeChatRoom={{
      id: 9,
      roomId: 9,
      itemId: 2,
      itemTitle: 'Same title',
      sender: 'Other user',
      messages: [],
    }}
    items={[firstItem, linkedItem]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={setSelectedItem}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[]}
    loadingMessages={false}
  />)

  fireEvent.click(screen.getByText('Same title'))

  expect(setSelectedItem).toHaveBeenCalledWith(linkedItem)
  expect(screen.getByText(/2,000/)).toHaveTextContent('Second location')
  expect(screen.queryByText(/1,000/)).not.toBeInTheDocument()
})

it('formats a message timestamp only when it is rendered', () => {
  render(<ChatPage
    activeChatRoom={{
      id: 9,
      roomId: 9,
      itemId: 2,
      itemTitle: 'Camera',
      sender: 'Other user',
      messages: [{
        id: 42,
        sender: 'me',
        text: 'hello',
        time: '2026-08-02T12:51:07.314055',
        deliveryStatus: 'sent',
      }],
    }}
    items={[{
      id: 2,
      title: 'Camera',
      price: 2000,
      priceType: 'DAY',
      location: 'Second location',
    }]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[]}
    loadingMessages={false}
  />)

  expect(screen.getByText('12:51')).toBeInTheDocument()
  expect(screen.queryByText('2026-08-02T12:51:07.314055')).not.toBeInTheDocument()
})

it('formats the last-message timestamp in the chat room list', () => {
  const { container } = render(<ChatPage
    activeChatRoom={null}
    items={[]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[{
      id: 9,
      roomId: 9,
      itemId: 2,
      itemTitle: 'Camera',
      sender: 'Other user',
      lastMessage: 'hello',
      time: '2026-08-02T12:51:07.314055',
      unreadCount: 0,
    }]}
    loadingMessages={false}
  />)

  expect(container).toHaveTextContent('12:51')
  expect(container).not.toHaveTextContent('2026-08-02T12:51:07.314055')
})

it('shows a date separator only for the first message and date changes', () => {
  const { container } = render(<ChatPage
    activeChatRoom={{
      id: 9,
      roomId: 9,
      itemId: 2,
      itemTitle: 'Camera',
      sender: 'Other user',
      messages: [
        { id: 1, sender: 'other', text: 'first', time: '2026-08-02T09:00:00' },
        { id: 2, sender: 'me', text: 'same day', time: '2026-08-02T23:00:00' },
        { id: 3, sender: 'other', text: 'next day', time: '2026-08-03T00:10:00' },
      ],
    }}
    items={[{
      id: 2,
      title: 'Camera',
      price: 2000,
      priceType: 'DAY',
      location: 'Second location',
    }]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[]}
    loadingMessages={false}
  />)

  const view = within(container)
  expect(view.getAllByText('2026년 8월 2일')).toHaveLength(1)
  expect(view.getAllByText('2026년 8월 3일')).toHaveLength(1)
  expect(view.queryByText('2026년 5월 23일')).not.toBeInTheDocument()
})

it('does not invent price, location, or availability when a room has no linked item', () => {
  const { container } = render(<ChatPage
    activeChatRoom={{
      id: 9,
      roomId: 9,
      itemId: 404,
      itemTitle: '삭제된 물품',
      sender: 'Other user',
      messages: [],
    }}
    items={[]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[]}
    loadingMessages={false}
  />)

  expect(container).toHaveTextContent('물품 정보 없음')
  expect(screen.getByText('상태 확인 불가')).toBeInTheDocument()
  expect(screen.queryByText('15,000원/일')).not.toBeInTheDocument()
  expect(screen.queryByText('공학관 앞')).not.toBeInTheDocument()
})

it('shows the linked item actual rental status', () => {
  render(<ChatPage
    activeChatRoom={{
      id: 9,
      itemId: 2,
      itemTitle: '카메라',
      sender: '학생',
      messages: [],
    }}
    items={[{
      id: 2,
      title: '카메라',
      price: 2000,
      priceType: '일',
      location: '누리관 앞',
      status: 'rented',
    }]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[]}
    loadingMessages={false}
  />)

  expect(screen.getByText('대여 중')).toBeInTheDocument()
  expect(screen.queryByText('대여 가능')).not.toBeInTheDocument()
})

it('uses a neutral status when the linked item status is unknown', () => {
  render(<ChatPage
    activeChatRoom={{ id: 9, itemId: 2, itemTitle: '카메라', sender: '학생', messages: [] }}
    items={[{ id: 2, title: '카메라', price: 2000, priceType: '일', status: 'unknown' }]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[]}
    loadingMessages={false}
  />)

  expect(screen.getByText('상태 확인 불가')).toHaveClass('bg-slate-100')
})

it('opens a room from a keyboard-accessible chat-list control', () => {
  const selectChatRoom = vi.fn()
  const room = {
    id: 9,
    itemTitle: '우산',
    sender: '학생',
    lastMessage: '안녕하세요',
    unreadCount: 0,
  }
  render(<ChatPage
    activeChatRoom={null}
    items={[]}
    setActiveChatRoom={vi.fn()}
    selectChatRoom={selectChatRoom}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[room]}
    loadingMessages={false}
  />)

  fireEvent.click(screen.getByRole('button', { name: /학생.*우산.*안녕하세요/ }))

  expect(selectChatRoom).toHaveBeenCalledWith(room)
})

it('loads older messages and keeps current messages visible while reconnecting', () => {
  const loadOlder = vi.fn()
  render(<ChatPage
    activeChatRoom={{
      id: 9,
      roomId: 9,
      itemTitle: '우산',
      sender: '학생',
      messages: [{ id: 1, sender: 'other', text: '남아 있는 메시지' }],
    }}
    items={[]}
    setActiveChatRoom={vi.fn()}
    setSelectedItem={vi.fn()}
    chatInput=""
    setChatInput={vi.fn()}
    handleSendMessage={vi.fn()}
    chats={[]}
    loadingMessages={false}
    loadingOlder={false}
    hasOlder
    loadOlder={loadOlder}
    socketState="disconnected"
  />)

  fireEvent.click(screen.getByRole('button', { name: '이전 메시지 보기' }))

  expect(loadOlder).toHaveBeenCalledOnce()
  expect(screen.getByText('실시간 연결을 복구하는 중...')).toBeInTheDocument()
  expect(screen.getByText('남아 있는 메시지')).toBeInTheDocument()
})
