import { parseRental, parseRentals, parseReviewSubmission } from './schema';

export const backendRental = {
  id: 41,
  item_id: 7,
  item_title: '군화',
  borrower_id: 17,
  borrower_name: '대여학생',
  lender_id: 3,
  lender_name: '물품주인',
  chat_room_id: 12,
  status: 'APPROVED',
  start_date: '2026-08-24T09:00:00',
  end_date: '2026-08-26T18:00:00',
  total_price: 6000,
  created_at: '2026-08-23T10:00:00',
  updated_at: '2026-08-23T10:05:00',
  returned_at: null,
  review_deadline: null,
  review_state: 'NOT_AVAILABLE',
};

it('normalizes the complete snake_case rental response', () => {
  expect(parseRental(backendRental)).toEqual({
    id: 41,
    itemId: 7,
    itemTitle: '군화',
    borrowerId: 17,
    borrowerName: '대여학생',
    lenderId: 3,
    lenderName: '물품주인',
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
  });
});

it('validates rental lists and review workflow responses', () => {
  expect(parseRentals([backendRental])).toEqual([expect.objectContaining({ id: 41 })]);
  expect(parseReviewSubmission({
    review_state: 'SUBMITTED_WAITING',
    review_deadline: '2026-09-01T10:00:00Z',
    review: null,
  })).toEqual({
    reviewState: 'SUBMITTED_WAITING',
    reviewDeadline: '2026-09-01T10:00:00Z',
  });
  expect(() => parseRentals({ content: [] })).toThrow('rentals');
  expect(() => parseReviewSubmission({ review_state: 'UNKNOWN', review_deadline: null }))
    .toThrow('review_state');
});

it.each([
  ['id', { ...backendRental, id: '41' }],
  ['status', { ...backendRental, status: 'UNKNOWN' }],
  ['item_id', { ...backendRental, item_id: null }],
  ['item_title', { ...backendRental, item_title: '' }],
  ['borrower_name', { ...backendRental, borrower_name: null }],
  ['start_date', { ...backendRental, start_date: null }],
])('rejects a malformed %s instead of returning partial rental data', (_field, payload) => {
  expect(() => parseRental(payload)).toThrow('rental');
});
