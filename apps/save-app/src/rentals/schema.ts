import type { Rental, RentalStatus, ReviewState, ReviewSubmission } from './types';

function protocolError(field: string): never {
  throw new Error(`Invalid rental response: ${field}`);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    protocolError('rental');
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isInteger(value)
    ? value
    : protocolError(field);
}

function string(value: unknown, field: string): string {
  return typeof value === 'string' ? value : protocolError(field);
}

function nonBlankString(value: unknown, field: string): string {
  const parsed = string(value, field);
  return parsed.trim() ? parsed : protocolError(field);
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : string(value, field);
}

function rentalStatus(value: unknown): RentalStatus {
  return value === 'REQUESTED'
    || value === 'APPROVED'
    || value === 'PAID'
    || value === 'RENTING'
    || value === 'RETURNED'
    || value === 'REJECTED'
    || value === 'CANCELED'
    ? value
    : protocolError('status');
}

function reviewState(value: unknown): ReviewState {
  return value === 'NOT_AVAILABLE'
    || value === 'AVAILABLE'
    || value === 'SUBMITTED_WAITING'
    || value === 'PUBLISHED'
    || value === 'EXPIRED'
    ? value
    : protocolError('review_state');
}

export function parseRental(value: unknown): Rental {
  const rental = record(value);
  return {
    id: integer(rental.id, 'id'),
    itemId: integer(rental.item_id, 'item_id'),
    itemTitle: nonBlankString(rental.item_title, 'item_title'),
    borrowerId: integer(rental.borrower_id, 'borrower_id'),
    borrowerName: nonBlankString(rental.borrower_name, 'borrower_name'),
    lenderId: integer(rental.lender_id, 'lender_id'),
    lenderName: nonBlankString(rental.lender_name, 'lender_name'),
    chatRoomId: integer(rental.chat_room_id, 'chat_room_id'),
    status: rentalStatus(rental.status),
    startDate: string(rental.start_date, 'start_date'),
    endDate: string(rental.end_date, 'end_date'),
    totalPrice: integer(rental.total_price, 'total_price'),
    createdAt: string(rental.created_at, 'created_at'),
    updatedAt: string(rental.updated_at, 'updated_at'),
    returnedAt: nullableString(rental.returned_at, 'returned_at'),
    reviewDeadline: nullableString(rental.review_deadline, 'review_deadline'),
    reviewState: reviewState(rental.review_state),
  };
}

export function parseRentals(value: unknown): Rental[] {
  if (!Array.isArray(value)) protocolError('rentals');
  return value.map(parseRental);
}

export function parseReviewSubmission(value: unknown): ReviewSubmission {
  const submission = record(value);
  return {
    reviewState: reviewState(submission.review_state),
    reviewDeadline: nullableString(submission.review_deadline, 'review_deadline'),
  };
}
