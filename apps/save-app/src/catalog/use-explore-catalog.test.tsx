import { act, renderHook } from '@testing-library/react-native';

import { listItems } from './api';
import type { CatalogItem } from './types';
import { useExploreCatalog } from './use-explore-catalog';

jest.mock('./api', () => ({ listItems: jest.fn() }));

const listItemsMock = jest.mocked(listItems);

function item(id: number, title: string): CatalogItem {
  return {
    id,
    ownerId: 1,
    ownerName: '사용자',
    ownerUniversityId: 1,
    ownerUniversityName: '부경대학교',
    type: 'LEND',
    title,
    rentalFee: 1000,
    rentalUnit: 'DAY',
    pickupLocationId: 1,
    pickupLocationName: '도서관',
    description: '',
    precautions: null,
    status: 'AVAILABLE',
    imageUrls: [],
    viewCount: 0,
    wishlistCount: 0,
    wishlisted: false,
    ownerRating: 0,
    reviewCount: 0,
    createdAt: '2026-08-26T12:00:00',
    updatedAt: '2026-08-26T12:00:00',
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => jest.useRealTimers());

it('keeps the newest search results when an older request resolves last', async () => {
  let resolveFirst: ((value: Awaited<ReturnType<typeof listItems>>) => void) | undefined;
  let resolveSecond: ((value: Awaited<ReturnType<typeof listItems>>) => void) | undefined;
  listItemsMock
    .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
    .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));

  const { result, rerender } = renderHook<
    ReturnType<typeof useExploreCatalog>,
    { query: string }
  >(
    ({ query }: { query: string }) => useExploreCatalog(query, 1),
    { initialProps: { query: '책' } },
  );
  await act(async () => jest.advanceTimersByTime(300));

  rerender({ query: '삼각대' });
  await act(async () => jest.advanceTimersByTime(300));

  await act(async () => resolveSecond?.({
    content: [item(2, '삼각대')], pageNumber: 0, pageSize: 20, totalElements: 1,
  }));
  await act(async () => resolveFirst?.({
    content: [item(1, '책')], pageNumber: 0, pageSize: 20, totalElements: 1,
  }));

  expect(result.current.items.map(value => value.title)).toEqual(['삼각대']);
});
