import { fireEvent, render, screen } from '@testing-library/react-native';

import RentalNotificationScreen from '@/app/(authenticated)/rentals/[id]';
import { ApiError } from '@/api/client';
import { getRental } from '@/rentals/api';
import type { Rental } from '@/rentals/types';

const mockBack = jest.fn();
let mockRouteId = '41';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ back: mockBack }),
}));
jest.mock('@/rentals/api', () => ({ getRental: jest.fn() }));

const getRentalMock = jest.mocked(getRental);
const rental: Rental = {
  id: 41,
  itemId: 7,
  borrowerId: 17,
  lenderId: 3,
  chatRoomId: 12,
  status: 'APPROVED',
  startDate: '2026-08-24T09:00:00',
  endDate: '2026-08-26T18:00:00',
  totalPrice: 6000,
  createdAt: '2026-08-23T10:00:00',
  updatedAt: '2026-08-23T10:05:00',
  returnedAt: null,
  reviewDeadline: null,
  reviewState: 'NOT_AVAILABLE',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteId = '41';
  getRentalMock.mockResolvedValue(rental);
});

it('renders only the real item, status, and rental period', async () => {
  await render(<RentalNotificationScreen />);

  expect(await screen.findByText('물품 #7')).toBeTruthy();
  expect(screen.getByText('승인됨')).toBeTruthy();
  expect(screen.getByText('2026. 8. 24.')).toBeTruthy();
  expect(screen.getByText('2026. 8. 26.')).toBeTruthy();
  expect(screen.queryByText('승인하기')).toBeNull();
});

it('shows a neutral not-found state for an invalid route or 404', async () => {
  mockRouteId = 'invalid';
  const view = await render(<RentalNotificationScreen />);
  expect(await screen.findByText('대여 정보를 찾을 수 없습니다.')).toBeTruthy();
  expect(getRentalMock).not.toHaveBeenCalled();

  mockRouteId = '41';
  getRentalMock.mockRejectedValue(new ApiError('missing', 404));
  await view.unmount();
  await render(<RentalNotificationScreen />);
  expect(await screen.findByText('대여 정보를 찾을 수 없습니다.')).toBeTruthy();
});

it('offers a retry after a temporary loading failure', async () => {
  getRentalMock
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(rental);
  await render(<RentalNotificationScreen />);

  expect(await screen.findByRole('alert')).toHaveTextContent('대여 정보를 불러오지 못했습니다.');
  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
  expect(await screen.findByText('물품 #7')).toBeTruthy();
  expect(getRentalMock).toHaveBeenCalledTimes(2);
});
