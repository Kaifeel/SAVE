import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getItem, setWishlist } from './api';
import { useItemDetail } from './use-item-detail';
import { catalogItem } from '@/test-utils/catalog-fixtures';

let focusEffect: (() => void) | undefined;

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (effect: () => void) => {
      focusEffect = effect;
      React.useEffect(effect, [effect]);
    },
  };
});

jest.mock('./api', () => ({
  getItem: jest.fn(),
  setWishlist: jest.fn(),
}));

const getItemMock = jest.mocked(getItem);
const setWishlistMock = jest.mocked(setWishlist);

beforeEach(() => {
  jest.clearAllMocks();
  focusEffect = undefined;
  setWishlistMock.mockResolvedValue(undefined);
});

it('replaces an expired image URL when the detail screen regains focus', async () => {
  getItemMock
    .mockResolvedValueOnce({ ...catalogItem, imageUrls: ['https://signed.example/old'] })
    .mockResolvedValueOnce({ ...catalogItem, imageUrls: ['https://signed.example/new'] });

  const { result } = await renderHook(() => useItemDetail(catalogItem.id));
  await waitFor(() => expect(result.current.item?.imageUrls).toEqual([
    'https://signed.example/old',
  ]));
  expect(focusEffect).toBeDefined();

  await act(async () => { focusEffect?.(); });

  await waitFor(() => expect(result.current.item?.imageUrls).toEqual([
    'https://signed.example/new',
  ]));
  expect(getItemMock).toHaveBeenCalledTimes(2);
});
