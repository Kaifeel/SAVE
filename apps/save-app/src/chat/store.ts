import { create } from 'zustand';

import { useAuthStore } from '@/auth/store';
import {
  listChatRooms,
  loadChatMessages,
  markChatRoomRead,
  sendChatMessage,
} from './api';
import {
  createChatSocket,
  type ChatSocket,
  type ChatSocketState,
} from './socket';
import type { ChatMessage, ChatRoom } from './types';

export type TimelineMessage = Omit<ChatMessage, 'id'> & {
  id: number | string;
  clientId?: string;
  deliveryStatus: 'sent' | 'sending' | 'failed';
};

type ChatStateData = {
  rooms: ChatRoom[];
  activeRoomId: number | null;
  messages: TimelineMessage[];
  nextBefore: number | null;
  hasOlder: boolean;
  socketState: ChatSocketState;
  hasConnectedRealtime: boolean;
  loadingRooms: boolean;
  loadingMessages: boolean;
  loadingOlder: boolean;
  roomsError: string | null;
  messagesError: string | null;
  sendError: string | null;
};

type ChatState = ChatStateData & {
  loadRooms: () => Promise<void>;
  openRoom: (roomId: number) => Promise<void>;
  loadOlder: () => Promise<void>;
  send: (message: string) => Promise<void>;
  retry: (clientId: string) => Promise<void>;
  closeRoom: () => void;
  connectRealtime: (accessToken: string) => void;
  disconnectRealtime: () => Promise<void>;
};

export const initialChatState: ChatStateData = {
  rooms: [],
  activeRoomId: null,
  messages: [],
  nextBefore: null,
  hasOlder: false,
  socketState: 'disconnected',
  hasConnectedRealtime: false,
  loadingRooms: false,
  loadingMessages: false,
  loadingOlder: false,
  roomsError: null,
  messagesError: null,
  sendError: null,
};

let socket: ChatSocket | null = null;
let unsubscribeRoom: (() => void) | null = null;
let unsubscribeChatList: (() => void) | null = null;
let unsubscribeNotifications: (() => void) | null = null;
let roomRequestId = 0;
let optimisticId = 0;
let socketGeneration = 0;

function timelineMessage(message: ChatMessage): TimelineMessage {
  return { ...message, deliveryStatus: 'sent' };
}

function deduplicate(messages: TimelineMessage[]): TimelineMessage[] {
  const ids = new Set<string>();
  return messages.filter(message => {
    if (typeof message.id !== 'number') return true;
    const id = String(message.id);
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  });
}

function mergeMessageSnapshot(
  snapshot: TimelineMessage[],
  current: TimelineMessage[],
): TimelineMessage[] {
  return deduplicate([...snapshot, ...current]).sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const safeLeftTime = Number.isNaN(leftTime) ? Number.POSITIVE_INFINITY : leftTime;
    const safeRightTime = Number.isNaN(rightTime) ? Number.POSITIVE_INFINITY : rightTime;
    return safeLeftTime - safeRightTime;
  });
}

function replaceOptimistic(
  messages: TimelineMessage[],
  clientId: string,
  saved: ChatMessage,
): TimelineMessage[] {
  const replacement = timelineMessage(saved);
  return deduplicate(messages.map(message =>
    message.clientId === clientId ? replacement : message));
}

function upsertRoom(rooms: ChatRoom[], incoming: ChatRoom, activeRoomId: number | null) {
  const room = incoming.id === activeRoomId ? { ...incoming, unreadCount: 0 } : incoming;
  return [room, ...rooms.filter(entry => entry.id !== incoming.id)];
}

function mergeRoomSnapshot(snapshot: ChatRoom[], current: ChatRoom[], activeRoomId: number | null) {
  return snapshot.map(room => {
    const existing = current.find(value => value.id === room.id);
    const snapshotTime = room.lastMessageAt ? Date.parse(room.lastMessageAt) : 0;
    const existingTime = existing?.lastMessageAt ? Date.parse(existing.lastMessageAt) : 0;
    const merged = existing && existingTime > snapshotTime
      ? {
        ...room,
        lastMessage: existing.lastMessage,
        lastMessageAt: existing.lastMessageAt,
        unreadCount: existing.unreadCount,
      }
      : room;
    return merged.id === activeRoomId ? { ...merged, unreadCount: 0 } : merged;
  });
}

export const useChatStore = create<ChatState>((set, get) => {
  const handleRoomMessage = (message: ChatMessage) => {
    const currentUserId = useAuthStore.getState().user?.id;
    set(state => {
      if (state.activeRoomId !== message.roomId) return state;
      const hasMessage = state.messages.some(entry =>
        typeof entry.id === 'number' && entry.id === message.id);
      const messages = hasMessage
        ? state.messages
        : [...state.messages, timelineMessage(message)];
      return {
        messages,
        rooms: state.rooms.map(room => room.id === message.roomId
          ? {
            ...room,
            lastMessage: message.message,
            lastMessageAt: message.createdAt,
            unreadCount: 0,
          }
          : room),
      };
    });
    if (message.senderId !== currentUserId) {
      void markChatRoomRead(message.roomId).catch(() => undefined);
    }
  };

  const subscribeActiveRoom = (roomId: number | null) => {
    unsubscribeRoom?.();
    unsubscribeRoom = null;
    if (socket && roomId !== null) {
      const generation = socketGeneration;
      unsubscribeRoom = socket.subscribeRoom(roomId, message => {
        if (generation !== socketGeneration) return;
        handleRoomMessage(message);
      });
    }
  };

  const deliver = async (clientId: string, roomId: number, text: string) => {
    try {
      const saved = await sendChatMessage(roomId, text);
      set(state => ({
        messages: replaceOptimistic(state.messages, clientId, saved),
        sendError: null,
        rooms: state.rooms.map(room => room.id === roomId
          ? { ...room, lastMessage: saved.message, lastMessageAt: saved.createdAt }
          : room),
      }));
    } catch {
      set(state => ({
        messages: state.messages.map(message => message.clientId === clientId
          ? { ...message, deliveryStatus: 'failed' }
          : message),
        sendError: '메시지를 보내지 못했습니다.',
      }));
    }
  };

  const loadRooms = async () => {
    set({ loadingRooms: true, roomsError: null });
    try {
      const rooms = await listChatRooms();
      const activeRoomId = get().activeRoomId;
      set(state => ({
        rooms: mergeRoomSnapshot(rooms, state.rooms, activeRoomId),
        loadingRooms: false,
      }));
    } catch {
      set({ loadingRooms: false, roomsError: '채팅 목록을 불러오지 못했습니다.' });
    }
  };

  const resynchronizeActiveRoom = async () => {
    const roomId = get().activeRoomId;
    if (roomId === null) return;
    const requestId = roomRequestId + 1;
    roomRequestId = requestId;

    try {
      const page = await loadChatMessages(roomId, null);
      if (roomRequestId !== requestId || get().activeRoomId !== roomId) return;
      set(state => ({
        messages: mergeMessageSnapshot(
          page.messages.map(timelineMessage),
          state.messages,
        ),
        nextBefore: page.nextBefore,
        hasOlder: page.hasMore,
        messagesError: null,
        rooms: state.rooms.map(room => room.id === roomId
          ? { ...room, unreadCount: 0 }
          : room),
      }));
      void markChatRoomRead(roomId).catch(() => undefined);
    } catch {
      if (roomRequestId === requestId && get().activeRoomId === roomId) {
        set({ messagesError: '메시지를 다시 불러오지 못했습니다.' });
      }
    }
  };

  return {
    ...initialChatState,
    loadRooms,
    openRoom: async roomId => {
      const requestId = roomRequestId + 1;
      roomRequestId = requestId;
      set({
        activeRoomId: roomId,
        messages: [],
        nextBefore: null,
        hasOlder: false,
        loadingMessages: true,
        messagesError: null,
        sendError: null,
      });
      subscribeActiveRoom(roomId);
      try {
        const roomSnapshot = get().rooms.some(room => room.id === roomId)
          ? Promise.resolve()
          : loadRooms();
        const [page] = await Promise.all([
          loadChatMessages(roomId, null),
          roomSnapshot,
        ]);
        if (roomRequestId !== requestId || get().activeRoomId !== roomId) return;
        set(state => ({
          messages: mergeMessageSnapshot(
            page.messages.map(timelineMessage),
            state.messages,
          ),
          nextBefore: page.nextBefore,
          hasOlder: page.hasMore,
          loadingMessages: false,
          rooms: state.rooms.map(room => room.id === roomId
            ? { ...room, unreadCount: 0 }
            : room),
        }));
        void markChatRoomRead(roomId).catch(() => undefined);
      } catch {
        if (roomRequestId === requestId && get().activeRoomId === roomId) {
          set({
            loadingMessages: false,
            messagesError: '메시지를 불러오지 못했습니다.',
          });
        }
      }
    },
    loadOlder: async () => {
      const { activeRoomId, nextBefore, hasOlder, loadingOlder } = get();
      if (activeRoomId === null || nextBefore === null || !hasOlder || loadingOlder) return;
      set({ loadingOlder: true, messagesError: null });
      try {
        const page = await loadChatMessages(activeRoomId, nextBefore);
        if (get().activeRoomId !== activeRoomId) return;
        set(state => ({
          messages: deduplicate([
            ...page.messages.map(timelineMessage),
            ...state.messages,
          ]),
          nextBefore: page.nextBefore,
          hasOlder: page.hasMore,
          loadingOlder: false,
        }));
      } catch {
        if (get().activeRoomId === activeRoomId) {
          set({ loadingOlder: false, messagesError: '이전 메시지를 불러오지 못했습니다.' });
        }
      }
    },
    send: async rawMessage => {
      const text = rawMessage.trim();
      const roomId = get().activeRoomId;
      const user = useAuthStore.getState().user;
      if (!text || roomId === null || !user) return;
      optimisticId += 1;
      const clientId = `client-${Date.now()}-${optimisticId}`;
      const optimistic: TimelineMessage = {
        id: clientId,
        clientId,
        roomId,
        senderId: user.id,
        senderName: user.name,
        message: text,
        isRead: true,
        createdAt: new Date().toISOString(),
        deliveryStatus: 'sending',
      };
      set(state => ({
        messages: [...state.messages, optimistic],
        sendError: null,
      }));
      await deliver(clientId, roomId, text);
    },
    retry: async clientId => {
      const failed = get().messages.find(message => message.clientId === clientId);
      const roomId = get().activeRoomId;
      if (!failed || roomId === null) return;
      set(state => ({
        messages: state.messages.map(message => message.clientId === clientId
          ? { ...message, deliveryStatus: 'sending' }
          : message),
        sendError: null,
      }));
      await deliver(clientId, roomId, failed.message);
    },
    closeRoom: () => {
      roomRequestId += 1;
      subscribeActiveRoom(null);
      set({
        activeRoomId: null,
        messages: [],
        nextBefore: null,
        hasOlder: false,
        loadingMessages: false,
        loadingOlder: false,
        messagesError: null,
        sendError: null,
      });
    },
    connectRealtime: accessToken => {
      socketGeneration += 1;
      const generation = socketGeneration;
      void socket?.disconnect();
      unsubscribeRoom = null;
      unsubscribeChatList = null;
      unsubscribeNotifications = null;
      let connectedOnce = false;
      socket = createChatSocket({
        accessToken,
        onStateChange: state => {
          if (generation !== socketGeneration) return;
          set(state === 'connected'
            ? { socketState: state, hasConnectedRealtime: true }
            : { socketState: state });
          if (state !== 'connected') return;

          void get().loadRooms();
          if (!connectedOnce) {
            connectedOnce = true;
            return;
          }

          void resynchronizeActiveRoom();
        },
        onProtocolError: () => {
          if (generation !== socketGeneration) return;
          set({ socketState: 'error' });
        },
      });
      unsubscribeChatList = socket.subscribeChatList(room => {
        if (generation !== socketGeneration) return;
        set(state => ({ rooms: upsertRoom(state.rooms, room, state.activeRoomId) }));
      });
      unsubscribeNotifications = socket.subscribeNotifications(() => {
        if (generation !== socketGeneration) return;
        void get().loadRooms();
      });
      subscribeActiveRoom(get().activeRoomId);
      socket.connect();
    },
    disconnectRealtime: async () => {
      socketGeneration += 1;
      unsubscribeRoom?.();
      unsubscribeChatList?.();
      unsubscribeNotifications?.();
      unsubscribeRoom = null;
      unsubscribeChatList = null;
      unsubscribeNotifications = null;
      const current = socket;
      socket = null;
      if (current) await current.disconnect();
      set({ socketState: 'disconnected', hasConnectedRealtime: false });
    },
  };
});
