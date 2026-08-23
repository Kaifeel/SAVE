export type RentalStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PAID'
  | 'RENTING'
  | 'RETURNED'
  | 'REJECTED'
  | 'CANCELED';

export type ReviewState =
  | 'NOT_AVAILABLE'
  | 'AVAILABLE'
  | 'SUBMITTED_WAITING'
  | 'PUBLISHED'
  | 'EXPIRED';

export type Rental = {
  id: number;
  itemId: number;
  borrowerId: number;
  lenderId: number;
  chatRoomId: number;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  returnedAt: string | null;
  reviewDeadline: string | null;
  reviewState: ReviewState;
};
