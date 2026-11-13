import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/auth/store';

import { useGoogleLogin } from './google-login';

const mockConfigure = jest.fn();
const mockCheckPlayServices = jest.fn<Promise<void>, []>();
const mockSignIn = jest.fn<Promise<unknown>, []>();
const mockCreateAccount = jest.fn<Promise<unknown>, []>();
const mockPresentExplicitSignIn = jest.fn<Promise<unknown>, []>();

jest.mock('react-native-nitro-google-signin', () => ({
  GoogleOneTapSignIn: {
    checkPlayServices: () => mockCheckPlayServices(),
    configure: (...args: unknown[]) => mockConfigure(...args),
    createAccount: () => mockCreateAccount(),
    presentExplicitSignIn: () => mockPresentExplicitSignIn(),
    signIn: () => mockSignIn(),
  },
  isNoSavedCredentialFoundResponse: (response: { type?: string }) =>
    response?.type === 'noSavedCredentialFound',
  isCancelledResponse: (response: { type?: string }) => response?.type === 'cancelled',
  isSuccessResponse: (response: { type?: string }) => response?.type === 'success',
}));

jest.mock('@/config/runtime', () => ({
  runtime: {
    googleAndroidClientId: 'android-client.apps.googleusercontent.com',
    googleIosClientId: '',
    googleWebClientId: 'web-client.apps.googleusercontent.com',
  },
}));

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);
const loginWithGoogleToken = jest.fn<Promise<void>, [string]>();
const successResponse = {
  data: { idToken: 'google-web-id-token', user: { email: 'user@pukyong.ac.kr' } },
  type: 'success',
};

beforeEach(() => {
  jest.clearAllMocks();
  loginWithGoogleToken.mockResolvedValue(undefined);
  mockCheckPlayServices.mockResolvedValue(undefined);
  mockSignIn.mockResolvedValue(successResponse);
  mockCreateAccount.mockResolvedValue(successResponse);
  mockPresentExplicitSignIn.mockResolvedValue(successResponse);
  mockUseAuthStore.mockImplementation(selector =>
    selector({ loginWithGoogleToken } as never),
  );
});

it('configures native Google sign-in with the server web client ID', () => {
  renderHook(() => useGoogleLogin());

  expect(mockConfigure).toHaveBeenCalledWith({
    webClientId: 'web-client.apps.googleusercontent.com',
  });
});

it('opens the explicit account chooser and forwards its Google ID token', async () => {
  const { result } = renderHook(() => useGoogleLogin());

  await act(() => result.current.prompt());

  expect(mockCheckPlayServices).toHaveBeenCalledTimes(1);
  expect(mockPresentExplicitSignIn).toHaveBeenCalledTimes(1);
  expect(mockSignIn).not.toHaveBeenCalled();
  expect(mockCreateAccount).not.toHaveBeenCalled();
  expect(loginWithGoogleToken).toHaveBeenCalledWith('google-web-id-token');
});

it('returns quietly when the explicit account chooser is cancelled', async () => {
  mockPresentExplicitSignIn.mockResolvedValue({ type: 'cancelled' });
  const { result } = renderHook(() => useGoogleLogin());

  await act(() => result.current.prompt());

  expect(loginWithGoogleToken).not.toHaveBeenCalled();
  expect(result.current.error).toBeNull();
});

it('reopens the chooser after rejection instead of retrying the rejected ID token', async () => {
  mockPresentExplicitSignIn
    .mockResolvedValueOnce({
      data: { idToken: 'gmail-token', user: { email: 'user@gmail.com' } },
      type: 'success',
    })
    .mockResolvedValueOnce({
      data: { idToken: 'pukyong-token', user: { email: 'user@pukyong.ac.kr' } },
      type: 'success',
    });
  loginWithGoogleToken
    .mockRejectedValueOnce(new Error('Google 계정 로그인을 완료하지 못했습니다.'))
    .mockResolvedValueOnce(undefined);
  const { result } = renderHook(() => useGoogleLogin());

  await act(() => result.current.prompt());
  await waitFor(() =>
    expect(result.current.error).toBe('Google 계정 로그인을 완료하지 못했습니다.'),
  );

  await act(() => result.current.prompt());

  expect(mockPresentExplicitSignIn).toHaveBeenCalledTimes(2);
  expect(loginWithGoogleToken).toHaveBeenNthCalledWith(1, 'gmail-token');
  expect(loginWithGoogleToken).toHaveBeenNthCalledWith(2, 'pukyong-token');
  expect(result.current.error).toBeNull();
});
