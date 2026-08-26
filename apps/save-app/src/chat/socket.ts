import {
  Client,
  type IMessage,
  type StompConfig,
  type StompSubscription,
} from '@stomp/stompjs';

import { runtime } from '@/config/runtime';
import { parseChatMessage, parseChatRoom } from './schema';
import type { ChatMessage, ChatRoom } from './types';

export type ChatSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

type ClientLike = {
  connected: boolean;
  activate: () => void;
  deactivate: () => Promise<void>;
  subscribe: (destination: string, handler: (frame: IMessage) => void) => StompSubscription;
};

type SubscriptionDescriptor<T> = {
  destination: string;
  parse: (value: unknown) => T;
  handler: (value: T) => void;
};

export type CreateChatSocketOptions = {
  accessToken: string;
  apiBaseUrl?: string;
  onStateChange?: (state: ChatSocketState) => void;
  onProtocolError?: (error: Error, frame: { body: string }) => void;
  clientFactory?: (config: StompConfig) => ClientLike;
};

export function chatSocketUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/ws-chat`;
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function parseNotification(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid chat notification response');
  }
  return value as Record<string, unknown>;
}

export function createChatSocket({
  accessToken,
  apiBaseUrl = runtime.apiBaseUrl,
  onStateChange = () => undefined,
  onProtocolError = () => undefined,
  clientFactory = config => new Client(config),
}: CreateChatSocketOptions) {
  const desired = new Map<string, SubscriptionDescriptor<unknown>>();
  const live = new Map<string, StompSubscription>();
  let client: ClientLike;

  const decode = <T>(frame: IMessage, parse: (value: unknown) => T): T | undefined => {
    try {
      return parse(JSON.parse(frame.body));
    } catch (error) {
      onProtocolError(error instanceof Error ? error : new Error(String(error)), frame);
      return undefined;
    }
  };

  const activateDescriptor = (key: string, descriptor: SubscriptionDescriptor<unknown>) => {
    live.get(key)?.unsubscribe();
    live.set(key, client.subscribe(descriptor.destination, frame => {
      const value = decode(frame, descriptor.parse);
      if (value !== undefined) descriptor.handler(value);
    }));
  };

  const restoreSubscriptions = () => {
    live.forEach(subscription => subscription.unsubscribe());
    live.clear();
    desired.forEach((descriptor, key) => activateDescriptor(key, descriptor));
  };

  const config: StompConfig = {
    brokerURL: chatSocketUrl(apiBaseUrl),
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    beforeConnect: () => onStateChange('connecting'),
    onConnect: () => {
      onStateChange('connected');
      restoreSubscriptions();
    },
    onStompError: () => onStateChange('error'),
    onWebSocketClose: () => onStateChange('disconnected'),
  };
  client = clientFactory(config);

  const subscribe = <T>(key: string, descriptor: SubscriptionDescriptor<T>) => {
    live.get(key)?.unsubscribe();
    desired.set(key, descriptor as SubscriptionDescriptor<unknown>);
    if (client.connected) activateDescriptor(key, descriptor as SubscriptionDescriptor<unknown>);
    return () => {
      desired.delete(key);
      live.get(key)?.unsubscribe();
      live.delete(key);
    };
  };

  return {
    connect() {
      client.activate();
    },
    async disconnect() {
      desired.clear();
      live.forEach(subscription => subscription.unsubscribe());
      live.clear();
      await client.deactivate();
    },
    subscribeRoom(roomId: number, handler: (message: ChatMessage) => void) {
      return subscribe(`room:${roomId}`, {
        destination: `/topic/chats/rooms/${roomId}`,
        parse: parseChatMessage,
        handler,
      });
    },
    subscribeChatList(handler: (room: ChatRoom) => void) {
      return subscribe('chat-list', {
        destination: '/user/queue/chat-list',
        parse: parseChatRoom,
        handler,
      });
    },
    subscribeNotifications(handler: (notification: Record<string, unknown>) => void) {
      return subscribe('notifications', {
        destination: '/user/queue/notifications',
        parse: parseNotification,
        handler,
      });
    },
  };
}

export type ChatSocket = ReturnType<typeof createChatSocket>;
