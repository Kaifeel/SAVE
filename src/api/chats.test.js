import { afterEach, expect, it, vi } from 'vitest'
import { createOrGetChatRoom } from './chats'

afterEach(() => vi.unstubAllGlobals())

it('prepares a mock rental without opening a server chat room', async () => {
  const fetchMock = vi.fn(() => Promise.reject(new Error('network must not be called')))
  vi.stubGlobal('fetch', fetchMock)

  await expect(createOrGetChatRoom(7, null, { enabled: false })).resolves.toEqual({
    chat_room_id: null,
    item_id: 7,
  })
  expect(fetchMock).not.toHaveBeenCalled()
})
