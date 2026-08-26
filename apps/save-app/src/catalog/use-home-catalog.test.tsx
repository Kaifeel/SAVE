import { act, renderHook } from '@testing-library/react-native';

import { catalogItem, catalogPage } from '@/test-utils/catalog-fixtures';
import { getRecommendationHistory, listItems } from './api';
import { useHomeCatalog } from './use-home-catalog';

jest.mock('./api', () => ({
  createRecommendation: jest.fn(),
  getRecommendationHistory: jest.fn(),
  listItems: jest.fn(),
}));

const listItemsMock = jest.mocked(listItems);
const historyMock = jest.mocked(getRecommendationHistory);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => jest.useRealTimers());

it('keeps a newer refresh when the initial home request resolves last', async () => {
  let resolveOldPopular: ((value: ReturnType<typeof catalogPage>) => void) | undefined;
  let resolveOldRecent: ((value: ReturnType<typeof catalogPage>) => void) | undefined;
  let resolveOldHistory: ((value: []) => void) | undefined;
  const refreshed = { ...catalogItem, id: 8, title: '새 물품' };
  listItemsMock
    .mockReturnValueOnce(new Promise(resolve => { resolveOldPopular = resolve; }))
    .mockReturnValueOnce(new Promise(resolve => { resolveOldRecent = resolve; }))
    .mockResolvedValueOnce(catalogPage([refreshed]))
    .mockResolvedValueOnce(catalogPage([refreshed]));
  historyMock
    .mockReturnValueOnce(new Promise(resolve => { resolveOldHistory = resolve; }))
    .mockResolvedValueOnce([]);

  const { result } = renderHook(() => useHomeCatalog(1));
  await act(async () => jest.advanceTimersByTime(0));
  await act(async () => { await result.current.refresh(); });

  await act(async () => {
    resolveOldPopular?.(catalogPage([catalogItem]));
    resolveOldRecent?.(catalogPage([catalogItem]));
    resolveOldHistory?.([]);
  });

  expect(result.current.recent.map(item => item.title)).toEqual(['새 물품']);
});
