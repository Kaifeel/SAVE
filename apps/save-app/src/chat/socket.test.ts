import { chatSocketUrl, createChatSocket } from './socket';

function fakeClientFactory() {
  const handlers = new Map<string, (frame: { body: string }) => void>();
  const subscriptions: { unsubscribe: jest.Mock }[] = [];
  const client = {
    connected: false,
    activate: jest.fn(),
    deactivate: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn((destination: string, handler: (frame: { body: string }) => void) => {
      handlers.set(destination, handler);
      const subscription = { unsubscribe: jest.fn() };
      subscriptions.push(subscription);
      return subscription;
    }),
    triggerConnect() {
      client.connected = true;
      (client as typeof client & { onConnect: () => void }).onConnect();
    },
    emit(destination: string, body: string) {
      handlers.get(destination)?.({ body });
    },
  };
  const factory = jest.fn(options => Object.assign(client, options));
  return { client, factory, subscriptions };
}

describe('Expo chat STOMP adapter', () => {
  it('converts the API base URL to the native WebSocket endpoint', () => {
    expect(chatSocketUrl('https://save.example/api/v1')).toBe('wss://save.example/ws-chat');
    expect(chatSocketUrl('http://10.0.2.2:8080/api/v1')).toBe('ws://10.0.2.2:8080/ws-chat');
  });

  it('connects with the current bearer token', () => {
    const { client, factory } = fakeClientFactory();
    const socket = createChatSocket({
      accessToken: 'jwt-token',
      apiBaseUrl: 'https://save.example/api/v1',
      clientFactory: factory,
    });

    socket.connect();

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({
      brokerURL: 'wss://save.example/ws-chat',
      connectHeaders: { Authorization: 'Bearer jwt-token' },
    }));
    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('isolates malformed JSON without invoking a room handler', () => {
    const { client, factory } = fakeClientFactory();
    const onProtocolError = jest.fn();
    const handler = jest.fn();
    const socket = createChatSocket({
      accessToken: 'jwt-token',
      apiBaseUrl: 'https://save.example/api/v1',
      clientFactory: factory,
      onProtocolError,
    });
    socket.subscribeRoom(7, handler);
    client.triggerConnect();

    expect(() => client.emit('/topic/chats/rooms/7', '{invalid')).not.toThrow();
    expect(onProtocolError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    expect(handler).not.toHaveBeenCalled();
  });

  it('restores desired room subscriptions after reconnect', () => {
    const { client, factory, subscriptions } = fakeClientFactory();
    const socket = createChatSocket({
      accessToken: 'jwt-token',
      apiBaseUrl: 'https://save.example/api/v1',
      clientFactory: factory,
    });
    const unsubscribe = socket.subscribeRoom(7, jest.fn());

    client.triggerConnect();
    client.triggerConnect();

    expect(client.subscribe).toHaveBeenCalledTimes(2);
    expect(subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(subscriptions[1].unsubscribe).toHaveBeenCalledTimes(1);
  });
});
