import { useAuthStore } from '@/auth/store';
import { apiRequest } from './client';

jest.mock('@/config/runtime', () => ({
  runtime: { apiBaseUrl: 'https://api.save.test/api/v1' },
}));

const fetchMock = jest.fn();

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}

describe('apiRequest', () => {
  const refreshAccessToken = jest.fn<Promise<string>, []>();

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = fetchMock;
    useAuthStore.setState({
      accessToken: 'access-1',
      refreshAccessToken,
    });
  });

  it('sends the current bearer token and encoded query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ content: [] }));

    await apiRequest('/items', {
      params: { query: '렌즈 가방', only_available: true, empty: '', absent: null },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.save.test/api/v1/items?query=%EB%A0%8C%EC%A6%88+%EA%B0%80%EB%B0%A9&only_available=true',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-1' }),
      }),
    );
  });

  it('refreshes once after 401 and retries with the returned token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ id: 7 }));
    refreshAccessToken.mockResolvedValue('access-2');

    await expect(apiRequest('/items/7')).resolves.toEqual({ id: 7 });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer access-2' }),
    }));
  });

  it('does not retry a second 401', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'still expired' }, 401));
    refreshAccessToken.mockResolvedValue('access-2');

    await expect(apiRequest('/items/7')).rejects.toMatchObject({ status: 401 });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not convert an offline failure into a refresh attempt', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));

    await expect(apiRequest('/items')).rejects.toEqual(
      expect.objectContaining({ status: 0 }),
    );
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('returns undefined for a successful empty response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
    } as unknown as Response);

    await expect(apiRequest('/items/7/wishlist', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
