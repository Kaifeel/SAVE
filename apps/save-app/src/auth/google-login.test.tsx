import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/auth/store';

import { selectGoogleClientId, useGoogleLogin } from './google-login';

const mockUseAuthRequest = jest.fn();
const mockUseIdTokenAuthRequest = jest.fn();
const mockPromptAsync = jest.fn<Promise<{ type: 'dismiss' }>, []>();

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: (...args: unknown[]) => mockUseAuthRequest(...args),
  useIdTokenAuthRequest: (...args: unknown[]) => mockUseIdTokenAuthRequest(...args),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('@/config/runtime', () => ({
  runtime: {
    googleAndroidClientId: 'android-client.apps.googleusercontent.com',
    googleIosClientId: 'ios-client.apps.googleusercontent.com',
    googleWebClientId: 'web-client.apps.googleusercontent.com',
  },
}));

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);
const loginWithGoogleToken = jest.fn<Promise<void>, [string]>();
const successResponse = {
  authentication: null,
  errorCode: null,
  params: { id_token: 'google-web-id-token' },
  type: 'success' as const,
  url: 'https://save.example/auth',
};

beforeEach(() => {
  jest.clearAllMocks();
  loginWithGoogleToken.mockResolvedValue(undefined);
  mockPromptAsync.mockResolvedValue({ type: 'dismiss' });
  mockUseAuthStore.mockImplementation(selector =>
    selector({ loginWithGoogleToken } as never),
  );
  mockUseAuthRequest.mockReturnValue([{}, null, mockPromptAsync]);
  mockUseIdTokenAuthRequest.mockReturnValue([{}, null, mockPromptAsync]);
});

it.each([
  ['android', 'android-client.apps.googleusercontent.com'],
  ['ios', 'ios-client.apps.googleusercontent.com'],
  ['web', 'web-client.apps.googleusercontent.com'],
] as const)('selects the independent %s Google client ID', (platform, expectedClientId) => {
  expect(selectGoogleClientId(platform, {
    googleAndroidClientId: 'android-client.apps.googleusercontent.com',
    googleIosClientId: 'ios-client.apps.googleusercontent.com',
    googleWebClientId: 'web-client.apps.googleusercontent.com',
  })).toBe(expectedClientId);
});

it('selects the current platform client ID through the ID-token request hook', async () => {
  await renderHook(() => useGoogleLogin());

  expect(mockUseIdTokenAuthRequest).toHaveBeenCalledWith({
    androidClientId: 'android-client.apps.googleusercontent.com',
    clientId: 'ios-client.apps.googleusercontent.com',
    iosClientId: 'ios-client.apps.googleusercontent.com',
    language: 'ko',
    selectAccount: true,
    webClientId: 'web-client.apps.googleusercontent.com',
  });
  expect(mockUseAuthRequest).not.toHaveBeenCalled();
});

it('forwards a successful web ID-token response to the auth store', async () => {
  mockUseIdTokenAuthRequest.mockReturnValue([{}, successResponse, mockPromptAsync]);
  mockUseAuthRequest.mockReturnValue([
    {},
    { ...successResponse, params: { access_token: 'google-access-token' } },
    mockPromptAsync,
  ]);

  await renderHook(() => useGoogleLogin());

  await waitFor(() =>
    expect(loginWithGoogleToken).toHaveBeenCalledWith('google-web-id-token'),
  );
});

it('exposes a store rejection and retries the same ID token before reopening Google', async () => {
  loginWithGoogleToken
    .mockRejectedValueOnce(new Error('Google 계정 로그인을 완료하지 못했습니다.'))
    .mockResolvedValueOnce(undefined);
  mockUseIdTokenAuthRequest.mockReturnValue([{}, successResponse, mockPromptAsync]);
  mockUseAuthRequest.mockReturnValue([{}, successResponse, mockPromptAsync]);

  const { result } = await renderHook(() => useGoogleLogin());

  await waitFor(() =>
    expect(result.current.error).toBe('Google 계정 로그인을 완료하지 못했습니다.'),
  );

  await act(() => result.current.prompt());

  await waitFor(() => expect(loginWithGoogleToken).toHaveBeenCalledTimes(2));
  expect(loginWithGoogleToken).toHaveBeenLastCalledWith('google-web-id-token');
  expect(mockPromptAsync).not.toHaveBeenCalled();
  expect(result.current.error).toBeNull();
});
