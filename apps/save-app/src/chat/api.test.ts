import { apiRequest } from '@/api/client';
import {
  listChatRooms,
  loadChatMessages,
  markChatRoomRead,
  sendChatMessage,
} from './api';
import { backendMessage, backendRoom } from './schema.test';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('chat API', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('lists and validates chat rooms', async () => {
    apiRequestMock.mockResolvedValue([backendRoom]);

    await expect(listChatRooms()).resolves.toEqual([
      expect.objectContaining({ id: 7, unreadCount: 2 }),
    ]);
    expect(apiRequestMock).toHaveBeenCalledWith('/chats/rooms');
  });

  it('loads 50 messages and omits a null cursor', async () => {
    apiRequestMock.mockResolvedValue({
      messages: [backendMessage],
      next_before: null,
      has_more: false,
    });

    await loadChatMessages(7, null);

    expect(apiRequestMock).toHaveBeenCalledWith('/chats/rooms/7/messages', {
      params: { size: 50 },
    });
  });

  it('sends a cursor and validates the returned page', async () => {
    apiRequestMock.mockResolvedValue({ messages: [], next_before: 21, has_more: true });

    await loadChatMessages(7, 42);

    expect(apiRequestMock).toHaveBeenCalledWith('/chats/rooms/7/messages', {
      params: { size: 50, before: 42 },
    });
  });

  it('sends and marks messages read through the authoritative REST API', async () => {
    apiRequestMock
      .mockResolvedValueOnce(backendMessage)
      .mockResolvedValueOnce({ read_count: 3 });

    await expect(sendChatMessage(7, ' 안녕하세요 ')).resolves.toEqual(
      expect.objectContaining({ id: 21 }),
    );
    await expect(markChatRoomRead(7)).resolves.toEqual({ readCount: 3 });

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/chats/rooms/7/messages', {
      method: 'POST',
      body: JSON.stringify({ message: ' 안녕하세요 ' }),
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/chats/rooms/7/read', {
      method: 'PATCH',
    });
  });

  it('rejects a malformed successful response', async () => {
    apiRequestMock.mockResolvedValue([{ ...backendRoom, unread_count: 'two' }]);
    await expect(listChatRooms()).rejects.toThrow('chat');
  });
});
