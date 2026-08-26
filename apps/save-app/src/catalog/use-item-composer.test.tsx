import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createItem } from './api';
import { useItemComposer } from './use-item-composer';
import { getPickupLocations } from '@/universities/api';
import { catalogItem } from '@/test-utils/catalog-fixtures';
import type { CatalogItem, ItemPhotoAsset } from './types';

jest.mock('./api', () => ({ createItem: jest.fn() }));
jest.mock('@/universities/api', () => ({ getPickupLocations: jest.fn() }));

const createItemMock = jest.mocked(createItem);
const getPickupLocationsMock = jest.mocked(getPickupLocations);
const locations = [{ id: 4, name: '도서관 앞' }];

function photo(index: number): ItemPhotoAsset {
  return {
    uri: `file:///photo-${index}.jpg`,
    fileName: `photo-${index}.jpg`,
    mimeType: 'image/jpeg',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  getPickupLocationsMock.mockResolvedValue(locations);
  createItemMock.mockResolvedValue(catalogItem);
});

it('loads only the signed-in university pickup catalog and retries failures', async () => {
  getPickupLocationsMock
    .mockRejectedValueOnce(new Error('장소 서버 연결 실패'))
    .mockResolvedValueOnce(locations);
  const { result } = await renderHook(() => useItemComposer(2));

  await waitFor(() => expect(result.current.locationError).toBe('장소 서버 연결 실패'));
  await act(async () => { await result.current.retryLocations(); });

  expect(result.current.locations).toEqual(locations);
  expect(getPickupLocationsMock).toHaveBeenNthCalledWith(1, 2);
  expect(getPickupLocationsMock).toHaveBeenNthCalledWith(2, 2);
});

it('does not invent locations when university identity is missing', async () => {
  const { result } = await renderHook(() => useItemComposer(null));

  await waitFor(() => expect(result.current.locationError).toBe(
    '대학교 정보가 없어 거래 장소를 불러올 수 없습니다.',
  ));
  expect(result.current.locations).toEqual([]);
  expect(getPickupLocationsMock).not.toHaveBeenCalled();
});

it('keeps at most five selected photos and removes one by stable uri', async () => {
  const { result } = await renderHook(() => useItemComposer(2));

  await act(async () => {
    result.current.addPhotos([1, 2, 3, 4, 5, 6].map(photo));
  });
  expect(result.current.draft.photos.map(asset => asset.uri)).toEqual(
    [1, 2, 3, 4, 5].map(index => `file:///photo-${index}.jpg`),
  );
  expect(result.current.photoNotice).toBe('사진은 최대 5장까지 등록할 수 있습니다.');

  await act(async () => {
    result.current.removePhoto('file:///photo-3.jpg');
  });
  expect(result.current.draft.photos.map(asset => asset.uri)).not.toContain('file:///photo-3.jpg');
});

it('keeps the draft and allows only one request while submission is pending', async () => {
  const pending = deferred<CatalogItem>();
  createItemMock.mockReturnValue(pending.promise);
  const { result } = await renderHook(() => useItemComposer(2));
  await waitFor(() => expect(result.current.locations).toEqual(locations));

  await act(async () => {
    result.current.setField('title', '충전기');
    result.current.setField('rentalFee', '0');
    result.current.setField('pickupLocationId', 4);
  });
  await act(async () => {
    void result.current.submit();
    void result.current.submit();
  });

  expect(createItemMock).toHaveBeenCalledTimes(1);
  expect(result.current.submitting).toBe(true);
  await act(async () => { pending.reject(new Error('등록 서버 실패')); });
  await waitFor(() => expect(result.current.submitError).toBe('등록 서버 실패'));
  expect(result.current.draft.title).toBe('충전기');
  expect(result.current.submitting).toBe(false);
});

it('returns the server item and clears the draft after a successful submission', async () => {
  const { result } = await renderHook(() => useItemComposer(2));
  await waitFor(() => expect(result.current.locations).toEqual(locations));
  await act(async () => {
    result.current.setField('title', '충전기');
    result.current.setField('rentalFee', '1000');
    result.current.setField('pickupLocationId', 4);
  });

  let created: CatalogItem | null = null;
  await act(async () => { created = await result.current.submit(); });

  expect(created).toEqual(catalogItem);
  expect(createItemMock).toHaveBeenCalledWith(expect.objectContaining({
    title: '충전기',
    rentalFee: 1000,
    pickupLocationId: 4,
  }));
  expect(result.current.draft).toMatchObject({
    title: '',
    rentalFee: '',
    pickupLocationId: null,
    description: '',
    photos: [],
  });
});

it('creates a fresh draft for each hook mount', async () => {
  const first = await renderHook(() => useItemComposer(2));
  await act(async () => {
    first.result.current.setField('title', '첫 번째 초안');
  });
  await first.unmount();

  const second = await renderHook(() => useItemComposer(2));
  expect(second.result.current.draft.title).toBe('');
  expect(second.result.current.draft.photos).toEqual([]);
});
