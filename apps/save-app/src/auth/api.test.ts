import { ApiError, login, loginWithGoogle, logout, refresh, signup } from './api';

jest.mock('@/config/runtime', () => ({
  runtime: { apiBaseUrl: 'https://api.save.example/api/v1' },
}));

const sessionResponse = {
  access_token: 'access-value',
  token_type: 'Bearer',
  is_new_user: false,
  refresh_token: 'refresh-value',
  refresh_token_expires_at: '2026-09-17T10:00:00Z',
  user: {
    id: 17,
    email: 'student@pukyong.ac.kr',
    name: 'SAVE Student',
    department: null,
    university_id: 3,
    university_name: 'Pukyong National University',
    profile_image_url: null,
    role: 'USER',
  },
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

it('posts login JSON without cookie credentials and normalizes the complete session', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(sessionResponse),
  });

  await expect(login({ email: 'student@pukyong.ac.kr', password: 'password123' })).resolves.toEqual({
    accessToken: 'access-value',
    tokenType: 'Bearer',
    isNewUser: false,
    refreshToken: 'refresh-value',
    refreshTokenExpiresAt: '2026-09-17T10:00:00Z',
    user: {
      id: 17,
      email: 'student@pukyong.ac.kr',
      name: 'SAVE Student',
      department: null,
      universityId: 3,
      universityName: 'Pukyong National University',
      profileImageUrl: null,
      role: 'USER',
    },
  });
  expect(fetchMock).toHaveBeenCalledWith('https://api.save.example/api/v1/auth/mobile/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@pukyong.ac.kr', password: 'password123' }),
    cache: 'no-store',
  });
});

it('maps camel-case signup input to the backend request shape', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ ...sessionResponse, is_new_user: true }),
  });

  await signup({
    email: 'new@pukyong.ac.kr',
    password: 'password123',
    name: 'New Student',
    department: null,
    universityId: 3,
  });

  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    email: 'new@pukyong.ac.kr',
    password: 'password123',
    name: 'New Student',
    department: null,
    university_id: 3,
  });
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://api.save.example/api/v1/auth/mobile/signup',
  );
});

it.each([
  ['google', () => loginWithGoogle('google-id-value'), { id_token: 'google-id-value' }],
  ['refresh', () => refresh('refresh-value'), { refresh_token: 'refresh-value' }],
] as const)('posts the %s token as JSON', async (path, request, expectedBody) => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(sessionResponse),
  });

  await request();

  expect(fetchMock.mock.calls[0][0]).toBe(
    `https://api.save.example/api/v1/auth/mobile/${path}`,
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(expectedBody);
});

it('posts logout as JSON and accepts an empty response body', async () => {
  fetchMock.mockResolvedValue({ ok: true });

  await expect(logout('refresh-value')).resolves.toBeUndefined();

  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://api.save.example/api/v1/auth/mobile/logout',
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refresh_token: 'refresh-value' });
});

it('throws an ApiError with backend status and message without leaking the request token', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 401,
    json: jest
      .fn()
      .mockResolvedValue({ message: 'Refresh token secret-refresh-value is no longer valid' }),
  });

  const request = refresh('secret-refresh-value');

  await expect(request).rejects.toMatchObject({
    name: 'ApiError',
    status: 401,
    message: 'Refresh token [REDACTED] is no longer valid',
  });
  await expect(request).rejects.not.toHaveProperty('message', expect.stringContaining('secret-refresh-value'));
  await expect(request).rejects.toBeInstanceOf(ApiError);
});
