import { useAuthStore } from '@/auth/store';
import { runtime } from '@/config/runtime';

export type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
  accessToken?: string | null;
  retried?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function requestUrl(
  path: string,
  params: ApiRequestOptions['params'],
): string {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return `${runtime.apiBaseUrl}/${path.replace(/^\//, '')}${query ? `?${query}` : ''}`;
}

function errorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

async function responseData(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const contentType = response.headers.get('content-type') ?? '';
  try {
    return contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  } catch {
    throw new ApiError('서버 응답 형식이 올바르지 않습니다.', 502);
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { params, accessToken, retried = false, headers, ...init } = options;
  const token = accessToken === undefined
    ? useAuthStore.getState().accessToken
    : accessToken;

  let response: Response;
  try {
    response = await fetch(requestUrl(path, params), {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.', 0);
  }

  const data = await responseData(response);
  if (response.ok) {
    return data as T;
  }

  if (response.status === 401 && !retried && accessToken === undefined) {
    const nextToken = await useAuthStore.getState().refreshAccessToken();
    return apiRequest<T>(path, {
      ...options,
      accessToken: nextToken,
      retried: true,
    });
  }

  throw new ApiError(
    errorMessage(data, 'API 요청에 실패했습니다.'),
    response.status,
    data,
  );
}
