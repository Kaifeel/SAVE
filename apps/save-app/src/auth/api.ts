import { runtime } from '@/config/runtime';

import type { AuthUser, LoginInput, MobileSession, SignupInput } from './types';

type BackendAuthUser = {
  id: number;
  email: string;
  name: string;
  department: string | null;
  university_id: number | null;
  university_name: string | null;
  profile_image_url: string | null;
  role: AuthUser['role'];
};

type BackendMobileSession = {
  access_token: string;
  token_type: 'Bearer';
  is_new_user: boolean;
  refresh_token: string;
  refresh_token_expires_at: string;
  user: BackendAuthUser;
};

type ErrorResponse = {
  message?: unknown;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function redact(message: string, secrets: readonly string[]): string {
  return secrets.reduce(
    (safeMessage, secret) => (secret ? safeMessage.replaceAll(secret, '[REDACTED]') : safeMessage),
    message,
  );
}

async function readErrorMessage(response: Response, secrets: readonly string[]): Promise<string> {
  let payload: ErrorResponse | undefined;

  try {
    payload = (await response.json()) as ErrorResponse;
  } catch {
    // An empty or malformed error response uses the client fallback below.
  }

  const message = typeof payload?.message === 'string' ? payload.message : 'API request failed';
  return redact(message, secrets);
}

async function post(
  path: string,
  body: Record<string, unknown>,
  secrets: readonly string[] = [],
): Promise<Response> {
  const response = await fetch(`${runtime.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response, secrets), response.status);
  }

  return response;
}

function normalizeSession(response: BackendMobileSession): MobileSession {
  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    isNewUser: response.is_new_user,
    refreshToken: response.refresh_token,
    refreshTokenExpiresAt: response.refresh_token_expires_at,
    user: {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      department: response.user.department,
      universityId: response.user.university_id,
      universityName: response.user.university_name,
      profileImageUrl: response.user.profile_image_url,
      role: response.user.role,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isBackendAuthUser(value: unknown): value is BackendAuthUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'number' &&
    Number.isFinite(value.id) &&
    isNonBlankString(value.email) &&
    typeof value.name === 'string' &&
    isNullableString(value.department) &&
    isNullableFiniteNumber(value.university_id) &&
    isNullableString(value.university_name) &&
    isNullableString(value.profile_image_url) &&
    (value.role === 'USER' || value.role === 'ADMIN')
  );
}

function isBackendMobileSession(value: unknown): value is BackendMobileSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonBlankString(value.access_token) &&
    value.token_type === 'Bearer' &&
    typeof value.is_new_user === 'boolean' &&
    isNonBlankString(value.refresh_token) &&
    isNonBlankString(value.refresh_token_expires_at) &&
    Number.isFinite(Date.parse(value.refresh_token_expires_at)) &&
    isBackendAuthUser(value.user)
  );
}

function protocolError(): ApiError {
  return new ApiError('Invalid authentication response', 502);
}

async function requestSession(
  path: string,
  body: Record<string, unknown>,
  secrets: readonly string[] = [],
): Promise<MobileSession> {
  const response = await post(path, body, secrets);
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw protocolError();
  }

  if (!isBackendMobileSession(payload)) {
    throw protocolError();
  }

  return normalizeSession(payload);
}

export function login(input: LoginInput): Promise<MobileSession> {
  return requestSession('/auth/mobile/login', input);
}

export function signup(input: SignupInput): Promise<MobileSession> {
  return requestSession('/auth/mobile/signup', {
    email: input.email,
    password: input.password,
    name: input.name,
    department: input.department,
    university_id: input.universityId,
  });
}

export function loginWithGoogle(idToken: string): Promise<MobileSession> {
  return requestSession('/auth/mobile/google', { id_token: idToken }, [idToken]);
}

export function refresh(refreshToken: string): Promise<MobileSession> {
  return requestSession(
    '/auth/mobile/refresh',
    { refresh_token: refreshToken },
    [refreshToken],
  );
}

export async function logout(refreshToken: string): Promise<void> {
  await post('/auth/mobile/logout', { refresh_token: refreshToken }, [refreshToken]);
}
