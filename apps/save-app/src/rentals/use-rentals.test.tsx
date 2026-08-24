import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getMyRentals, submitRentalReview, transitionRental } from './api';
import { backendRental } from './schema.test';
import { parseRental } from './schema';
import { useRentals } from './use-rentals';

jest.mock('./api', () => ({
  getMyRentals: jest.fn(),
  submitRentalReview: jest.fn(),
  transitionRental: jest.fn(),
}));

const rental = parseRental({ ...backendRental, status: 'REQUESTED' });
const listMock = jest.mocked(getMyRentals);
const transitionMock = jest.mocked(transitionRental);
const reviewMock = jest.mocked(submitRentalReview);

beforeEach(() => {
  jest.clearAllMocks();
  listMock.mockResolvedValue([rental]);
  transitionMock.mockResolvedValue({ ...rental, status: 'RENTING' });
  reviewMock.mockResolvedValue({ reviewState: 'SUBMITTED_WAITING', reviewDeadline: null });
});

it('splits real rentals by the current user role', async () => {
  const lender = await renderHook(() => useRentals(3));
  await waitFor(() => expect(lender.result.current.loading).toBe(false));
  expect(lender.result.current.received).toEqual([rental]);
  expect(lender.result.current.sent).toEqual([]);
  await lender.unmount();

  const borrower = await renderHook(() => useRentals(17));
  await waitFor(() => expect(borrower.result.current.loading).toBe(false));
  expect(borrower.result.current.sent).toEqual([rental]);
});

it('replaces a rental with the authoritative transition response', async () => {
  const { result } = await renderHook(() => useRentals(3));
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => { await result.current.run(41, 'start'); });
  expect(transitionMock).toHaveBeenCalledWith(41, 'start');
  expect(result.current.rentals[0].status).toBe('RENTING');
});

it('updates only the review workflow after successful submission', async () => {
  listMock.mockResolvedValue([{ ...rental, status: 'RETURNED', reviewState: 'AVAILABLE' }]);
  const { result } = await renderHook(() => useRentals(3));
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => {
    await result.current.submitReview(41, { rating: 5, content: '좋았습니다.' });
  });
  expect(result.current.rentals[0].reviewState).toBe('SUBMITTED_WAITING');
});
