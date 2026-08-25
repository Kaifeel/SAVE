import { apiRequest } from '@/api/client';
import { createRental, getMyRentals, getRental, submitRentalReview, transitionRental } from './api';
import { backendRental } from './schema.test';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

beforeEach(() => {
  jest.clearAllMocks();
});

it('loads and validates one authorized rental', async () => {
  apiRequestMock.mockResolvedValue(backendRental);

  await expect(getRental(41)).resolves.toEqual(expect.objectContaining({ id: 41, itemId: 7 }));
  expect(apiRequestMock).toHaveBeenCalledWith('/rentals/41');
});

it('creates a rental using the backend request field names', async () => {
  apiRequestMock.mockResolvedValue(backendRental);
  await expect(createRental({
    itemId: 7,
    chatRoomId: 9,
    startDate: '2026-08-25T10:00:00',
    endDate: '2026-08-26T10:00:00',
    totalPrice: 3000,
  })).resolves.toEqual(expect.objectContaining({ id: 41 }));
  expect(apiRequestMock).toHaveBeenCalledWith('/rentals', {
    method: 'POST',
    body: JSON.stringify({
      item_id: 7,
      chat_room_id: 9,
      start_date: '2026-08-25T10:00:00',
      end_date: '2026-08-26T10:00:00',
      total_price: 3000,
    }),
  });
});

it('loads the authorized list and uses only backend-supported transitions', async () => {
  apiRequestMock.mockResolvedValueOnce([backendRental]).mockResolvedValueOnce({
    ...backendRental,
    status: 'RENTING',
  });

  await expect(getMyRentals()).resolves.toHaveLength(1);
  await expect(transitionRental(41, 'start')).resolves.toEqual(
    expect.objectContaining({ status: 'RENTING' }),
  );
  expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/rentals/me');
  expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/rentals/41/start', { method: 'PATCH' });
});

it('trims and submits a validated review', async () => {
  apiRequestMock.mockResolvedValue({ review_state: 'SUBMITTED_WAITING', review_deadline: null });

  await expect(submitRentalReview(41, { rating: 5, content: '  좋은 거래였습니다.  ' }))
    .resolves.toEqual({ reviewState: 'SUBMITTED_WAITING', reviewDeadline: null });
  expect(apiRequestMock).toHaveBeenCalledWith('/rentals/41/reviews', {
    method: 'POST',
    body: JSON.stringify({ rating: 5, content: '좋은 거래였습니다.' }),
  });
});

it('rejects invalid ids and review inputs before making a request', async () => {
  await expect(getRental(0)).rejects.toThrow('Invalid rental id');
  await expect(submitRentalReview(41, { rating: 0, content: '' })).rejects.toThrow('별점과 후기');
  expect(apiRequestMock).not.toHaveBeenCalled();
});
