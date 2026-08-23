import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getChatRooms } from '../api/chats.js'
import { useAppChats } from './useAppChats.js'

const testState = vi.hoisted(() => ({ options: null, chatData: null }))

vi.mock('../api/chats.js', () => ({ getChatRooms: vi.fn() }))
vi.mock('./useChatRooms.js', () => ({
  useChatRooms: options => {
    testState.options = options
    return testState.chatData
  },
}))

function setup(overrides = {}) {
  const toast = { error: vi.fn() }
  return {
    ...renderHook(() => useAppChats({
      accessToken: 'jwt',
      currentUserId: 1,
      apiEnabled: true,
      enabled: true,
      realtime: true,
      initialChats: [],
      onNotification: vi.fn(),
      toast,
      ...overrides,
    })),
    toast,
  }
}

describe('useAppChats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.options = null
    testState.chatData = {
      activeRoom: null,
      setActiveRoom: vi.fn(),
      selectRoom: vi.fn(),
      send: vi.fn().mockResolvedValue(undefined),
    }
    getChatRooms.mockResolvedValue([])
  })

  it('loads and normalizes the API room snapshot', async () => {
    getChatRooms.mockResolvedValue([{
      chat_room_id: 3,
      item_id: 7,
      item_title: '우산',
      opponent_name: '판매자',
    }])
    const { result } = setup()

    await waitFor(() => expect(result.current.chats).toHaveLength(1))

    expect(getChatRooms).toHaveBeenCalledWith('jwt')
    expect(result.current.chats[0]).toMatchObject({ id: 3, itemId: 7 })
  })

  it('merges realtime list updates and clears unread state for a read room', () => {
    const { result } = setup({
      apiEnabled: false,
      enabled: false,
      initialChats: [{ id: 3, unread: true, unreadCount: 2, messages: [] }],
    })

    act(() => testState.options.onChatListUpdate({
      chat_room_id: 3,
      unread_count: 4,
      last_message: '새 메시지',
    }, null))
    expect(result.current.chats[0]).toMatchObject({ unread: true, unreadCount: 4 })

    act(() => testState.options.onRoomRead(3))
    expect(result.current.chats[0]).toMatchObject({ unread: false, unreadCount: 0 })
  })

  it('clears input and delegates API message delivery', async () => {
    testState.chatData.activeRoom = { id: 3, messages: [] }
    const { result } = setup()
    act(() => result.current.setChatInput('  안녕하세요  '))

    await act(() => result.current.sendMessage())

    expect(testState.chatData.send).toHaveBeenCalledWith('안녕하세요')
    expect(result.current.chatInput).toBe('')
  })
})
