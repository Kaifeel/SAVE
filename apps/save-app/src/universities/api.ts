import { ApiError } from '@/auth/api';
import { runtime } from '@/config/runtime';

export type University = {
  id: number;
  name: string;
};

export type PickupLocation = {
  id: number;
  name: string;
};

function isUniversity(value: unknown): value is University {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0
  );
}

function isPickupLocation(value: unknown): value is PickupLocation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    Number.isInteger(candidate.id) &&
    candidate.id > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0
  );
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown };
    return typeof payload.message === 'string'
      ? payload.message
      : '대학교 목록을 불러오지 못했습니다.';
  } catch {
    return '대학교 목록을 불러오지 못했습니다.';
  }
}

export async function getUniversities(): Promise<University[]> {
  const response = await fetch(`${runtime.apiBaseUrl}/universities`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Invalid university catalog response', 502);
  }

  if (!Array.isArray(payload) || !payload.every(isUniversity)) {
    throw new ApiError('Invalid university catalog response', 502);
  }

  return payload;
}

export async function getPickupLocations(universityId: number): Promise<PickupLocation[]> {
  if (!Number.isInteger(universityId) || universityId <= 0) {
    throw new ApiError('Invalid university id', 400);
  }

  const response = await fetch(
    `${runtime.apiBaseUrl}/universities/${universityId}/pickup-locations`,
    {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    },
  );

  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Invalid pickup location catalog response', 502);
  }

  if (!Array.isArray(payload) || !payload.every(isPickupLocation)) {
    throw new ApiError('Invalid pickup location catalog response', 502);
  }

  return payload;
}
