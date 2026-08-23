import * as api from './api';
import * as secureSession from './secure-session';
import { setLogoutCleanup } from './logout-cleanup';
import { runtime } from '../config/runtime';
import { useAuthStore } from './store';
import type { MobileSession } from './types';

jest.mock('./api', () => {
  class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }

  return {
    ApiError,
    login: jest.fn(),
    signup: jest.fn(),
    loginWithGoogle: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
});

jest.mock('./secure-session', () => ({
  readRefreshToken: jest.fn(),
  writeRefreshToken: jest.fn(),
  clearRefreshToken: jest.fn(),
}));


jest.mock('../config/runtime', () => ({
  runtime: { mockEnabled: false },
}));

const readRefreshToken = jest.mocked(secureSession.readRefreshToken);
const writeRefreshToken = jest.mocked(secureSession.writeRefreshToken);
const clearRefreshToken = jest.mocked(secureSession.clearRefreshToken);
const login = jest.mocked(api.login);
const signup = jest.mocked(api.signup);
const loginWithGoogle = jest.mocked(api.loginWithGoogle);
const refresh = jest.mocked(api.refresh);
const revokeSession = jest.mocked(api.logout);
const unregisterPushToken = jest.fn<Promise<void>, [string]>();

const user: MobileSession['user'] = {
  id: 17,
  email: 'student@pukyong.ac.kr',
  name: 'SAVE Student',
  department: null,
  universityId: 3,
  universityName: 'Pukyong National University',
  profileImageUrl: null,
  role: 'USER',
};

const refreshedSession: MobileSession = {
  accessToken: 'new-access-value',
  tokenType: 'Bearer',
  isNewUser: false,
  refreshToken: 'rotated-refresh-value',
  refreshTokenExpiresAt: '2026-09-17T10:00:00Z',
  user,
};

beforeEach(() => {
  jest.clearAllMocks();
  runtime.mockEnabled = false;
  unregisterPushToken.mockResolvedValue();
  setLogoutCleanup(unregisterPushToken);
  useAuthStore.setState({
    status: 'hydrating',
    accessToken: null,
    user: null,
  });
});

it('unregisters push before clearing the authenticated access token', async () => {
  const events: string[] = [];
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  unregisterPushToken.mockImplementation(async () => { events.push('unregister-push'); });
  revokeSession.mockImplementation(async () => { events.push('revoke-session'); });
  clearRefreshToken.mockImplementation(async () => { events.push('clear-refresh'); });
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'old-access-value',
    user,
  });

  await useAuthStore.getState().logout();

  expect(unregisterPushToken).toHaveBeenCalledWith('old-access-value');
  expect(events).toEqual(['unregister-push', 'revoke-session', 'clear-refresh']);
  expect(useAuthStore.getState().accessToken).toBeNull();
});

it('still clears authentication when push unregistration fails', async () => {
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  unregisterPushToken.mockRejectedValue(new Error('push unavailable'));
  revokeSession.mockResolvedValue();
  clearRefreshToken.mockResolvedValue();
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'old-access-value',
    user,
  });

  await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();

  expect(revokeSession).toHaveBeenCalledWith('stored-refresh-value');
  expect(clearRefreshToken).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({
    status: 'unauthenticated',
    accessToken: null,
    user: null,
  });
});

it('creates an in-memory development session without calling the signup API in mock mode', async () => {
  runtime.mockEnabled = true;

  await useAuthStore.getState().signupWithEmail({
    email: 'student@pukyong.ac.kr',
    password: 'password123',
    name: 'SAVE Student',
    department: '컴퓨터공학과',
    universityId: 3,
  });

  expect(signup).not.toHaveBeenCalled();
  expect(writeRefreshToken).not.toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    accessToken: null,
    user: {
      id: 0,
      email: 'student@pukyong.ac.kr',
      name: 'SAVE Student',
      department: '컴퓨터공학과',
      universityId: 3,
      universityName: null,
      profileImageUrl: null,
      role: 'USER',
    },
  });
});

it('becomes unauthenticated without calling refresh when no token is stored', async () => {
  readRefreshToken.mockResolvedValue(null);

  await useAuthStore.getState().bootstrap();

  expect(useAuthStore.getState()).toMatchObject({
    status: 'unauthenticated',
    accessToken: null,
    user: null,
  });
  expect(refresh).not.toHaveBeenCalled();
});

it('persists a rotated token before exposing the refreshed in-memory session', async () => {
  let finishWriting: (() => void) | undefined;
  let signalWriteStarted: (() => void) | undefined;
  const writePending = new Promise<void>(resolve => {
    finishWriting = resolve;
  });
  const writeStarted = new Promise<void>(resolve => {
    signalWriteStarted = resolve;
  });
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  refresh.mockResolvedValue(refreshedSession);
  writeRefreshToken.mockImplementation(async () => {
    signalWriteStarted?.();
    await writePending;
  });

  const bootstrap = useAuthStore.getState().bootstrap();
  await writeStarted;

  expect(refresh).toHaveBeenCalledWith('stored-refresh-value');
  expect(writeRefreshToken).toHaveBeenCalledWith('rotated-refresh-value');
  expect(useAuthStore.getState()).toMatchObject({
    status: 'hydrating',
    accessToken: null,
    user: null,
  });

  finishWriting?.();
  await bootstrap;

  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    accessToken: 'new-access-value',
    user,
  });
});

it('clears an unauthorized stored token and becomes unauthenticated', async () => {
  readRefreshToken.mockResolvedValue('expired-refresh-value');
  refresh.mockRejectedValue(new api.ApiError('Refresh token is invalid', 401));

  await useAuthStore.getState().bootstrap();

  expect(clearRefreshToken).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({
    status: 'unauthenticated',
    accessToken: null,
    user: null,
  });
});

it('retains a stored token and becomes retryable offline after a network failure', async () => {
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  refresh.mockRejectedValue(new TypeError('Network request failed'));

  await useAuthStore.getState().bootstrap();

  expect(clearRefreshToken).not.toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({
    status: 'offline',
    accessToken: null,
    user: null,
  });
  expect(useAuthStore.getState().retryBootstrap).toEqual(expect.any(Function));

  refresh.mockResolvedValue(refreshedSession);
  writeRefreshToken.mockResolvedValue();
  await useAuthStore.getState().retryBootstrap();

  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    accessToken: 'new-access-value',
    user,
  });
});

it('shares one refresh request across concurrent callers', async () => {
  let finishRefresh: ((session: MobileSession) => void) | undefined;
  const refreshPending = new Promise<MobileSession>(resolve => {
    finishRefresh = resolve;
  });
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  refresh.mockReturnValue(refreshPending);
  writeRefreshToken.mockResolvedValue();

  const first = useAuthStore.getState().refreshAccessToken();
  const second = useAuthStore.getState().refreshAccessToken();
  const third = useAuthStore.getState().refreshAccessToken();
  await Promise.resolve();

  expect(refresh).toHaveBeenCalledTimes(1);
  finishRefresh?.(refreshedSession);

  await expect(Promise.all([first, second, third])).resolves.toEqual([
    'new-access-value',
    'new-access-value',
    'new-access-value',
  ]);
  expect(writeRefreshToken).toHaveBeenCalledTimes(1);
});

it('does not install a refresh response that arrives after logout', async () => {
  let finishRefresh: ((session: MobileSession) => void) | undefined;
  const refreshPending = new Promise<MobileSession>(resolve => {
    finishRefresh = resolve;
  });
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  refresh.mockReturnValue(refreshPending);
  revokeSession.mockResolvedValue();
  clearRefreshToken.mockResolvedValue();
  writeRefreshToken.mockResolvedValue();

  const refreshResult = useAuthStore.getState().refreshAccessToken().catch(error => error);
  await Promise.resolve();
  await useAuthStore.getState().logout();
  finishRefresh?.(refreshedSession);
  await refreshResult;

  expect(writeRefreshToken).not.toHaveBeenCalled();
  expect(clearRefreshToken).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({
    status: 'unauthenticated',
    accessToken: null,
    user: null,
  });
});

it('orders logout cleanup after a refresh-token write already underway', async () => {
  let finishWriting: (() => void) | undefined;
  let signalWriteStarted: (() => void) | undefined;
  const writePending = new Promise<void>(resolve => {
    finishWriting = resolve;
  });
  const writeStarted = new Promise<void>(resolve => {
    signalWriteStarted = resolve;
  });
  const storageEvents: string[] = [];
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  refresh.mockResolvedValue(refreshedSession);
  writeRefreshToken.mockImplementation(async () => {
    storageEvents.push('write-start');
    signalWriteStarted?.();
    await writePending;
    storageEvents.push('write-end');
  });
  revokeSession.mockResolvedValue();
  clearRefreshToken.mockImplementation(async () => {
    storageEvents.push('clear');
  });

  const refreshResult = useAuthStore.getState().refreshAccessToken().catch(error => error);
  await writeStarted;
  const logout = useAuthStore.getState().logout();
  await new Promise<void>(resolve => setImmediate(resolve));
  finishWriting?.();
  await Promise.all([refreshResult, logout]);

  expect(storageEvents).toEqual(['write-start', 'write-end', 'clear']);
  expect(useAuthStore.getState()).toMatchObject({
    status: 'unauthenticated',
    accessToken: null,
    user: null,
  });
});

it('persists and installs an email login session', async () => {
  login.mockResolvedValue(refreshedSession);
  writeRefreshToken.mockResolvedValue();

  await useAuthStore.getState().loginWithEmail({
    email: 'student@pukyong.ac.kr',
    password: 'password123',
  });

  expect(writeRefreshToken).toHaveBeenCalledWith('rotated-refresh-value');
  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    accessToken: 'new-access-value',
    user,
  });
});

it('persists and installs an email signup session', async () => {
  signup.mockResolvedValue(refreshedSession);
  writeRefreshToken.mockResolvedValue();

  await useAuthStore.getState().signupWithEmail({
    email: 'student@pukyong.ac.kr',
    password: 'password123',
    name: 'SAVE Student',
    department: '컴퓨터공학과',
    universityId: 3,
  });

  expect(writeRefreshToken).toHaveBeenCalledWith('rotated-refresh-value');
  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    accessToken: 'new-access-value',
    user,
  });
});

it('does not persist or expose a session when signup rejects a malformed protocol response', async () => {
  signup.mockRejectedValue(new api.ApiError('Invalid authentication response', 502));

  await expect(useAuthStore.getState().signupWithEmail({
    email: 'student@pukyong.ac.kr',
    password: 'password123',
    name: 'SAVE Student',
    department: '컴퓨터공학과',
    universityId: 3,
  })).rejects.toMatchObject({ status: 502 });

  expect(writeRefreshToken).not.toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({
    status: 'hydrating',
    accessToken: null,
    user: null,
  });
});

it('persists and installs a Google login session', async () => {
  loginWithGoogle.mockResolvedValue(refreshedSession);
  writeRefreshToken.mockResolvedValue();

  await useAuthStore.getState().loginWithGoogleToken('google-id-value');

  expect(writeRefreshToken).toHaveBeenCalledWith('rotated-refresh-value');
  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    accessToken: 'new-access-value',
    user,
  });
});

it('clears persisted and in-memory state even when server logout fails', async () => {
  readRefreshToken.mockResolvedValue('stored-refresh-value');
  revokeSession.mockRejectedValue(new TypeError('Network request failed'));
  clearRefreshToken.mockResolvedValue();
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'old-access-value',
    user,
  });

  await expect(useAuthStore.getState().logout()).rejects.toThrow('Network request failed');

  expect(revokeSession).toHaveBeenCalledWith('stored-refresh-value');
  expect(clearRefreshToken).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({
    status: 'unauthenticated',
    accessToken: null,
    user: null,
  });
});
