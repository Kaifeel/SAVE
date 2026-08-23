import { ApiError } from '@/auth/api';

import { getPickupLocations, getUniversities } from './api';

jest.mock('@/config/runtime', () => ({
  runtime: { apiBaseUrl: 'https://api.save.example/api/v1' },
}));

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

it('loads and validates the real public university catalog', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue([
      { id: 1, name: '부경대학교' },
      { id: 2, name: '한국해양대학교' },
    ]),
  });

  await expect(getUniversities()).resolves.toEqual([
    { id: 1, name: '부경대학교' },
    { id: 2, name: '한국해양대학교' },
  ]);
  expect(fetchMock).toHaveBeenCalledWith('https://api.save.example/api/v1/universities', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
});

it.each([
  ['not an array', { id: 1, name: '부경대학교' }],
  ['non-finite id', [{ id: Infinity, name: '부경대학교' }]],
  ['blank name', [{ id: 1, name: ' ' }]],
] as const)('rejects a malformed catalog when it is %s', async (_caseName, payload) => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(payload),
  });

  await expect(getUniversities()).rejects.toMatchObject({
    name: 'ApiError',
    status: 502,
    message: 'Invalid university catalog response',
  });
});

it('surfaces a sanitized API failure for catalog loading', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 503,
    json: jest.fn().mockResolvedValue({ message: '대학교 목록을 불러오지 못했습니다.' }),
  });

  await expect(getUniversities()).rejects.toEqual(
    expect.objectContaining<ApiError>({
      name: 'ApiError',
      status: 503,
      message: '대학교 목록을 불러오지 못했습니다.',
    }),
  );
});

it('loads pickup locations for the exact authenticated university', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue([
      { id: 4, name: '도서관 앞' },
      { id: 5, name: '학생회관' },
    ]),
  });

  await expect(getPickupLocations(2)).resolves.toEqual([
    { id: 4, name: '도서관 앞' },
    { id: 5, name: '학생회관' },
  ]);
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.save.example/api/v1/universities/2/pickup-locations',
    { cache: 'no-store', headers: { Accept: 'application/json' } },
  );
});

it.each([
  ['non-array response', { id: 4, name: '도서관 앞' }],
  ['string id', [{ id: '4', name: '도서관 앞' }]],
  ['blank name', [{ id: 4, name: '' }]],
] as const)('rejects malformed pickup location data: %s', async (_caseName, payload) => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(payload),
  });

  await expect(getPickupLocations(2)).rejects.toMatchObject({
    name: 'ApiError',
    status: 502,
    message: 'Invalid pickup location catalog response',
  });
});

it('rejects an invalid university id before requesting pickup locations', async () => {
  await expect(getPickupLocations(0)).rejects.toThrow('Invalid university id');
  expect(fetchMock).not.toHaveBeenCalled();
});
