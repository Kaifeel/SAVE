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
  itemTitle: string;
  borrowerId: number;
  borrowerName: string;
  lenderId: number;
  lenderName: string;
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

export type RentalAction = 'start' | 'reject' | 'cancel' | 'return';

export type RentalReviewInput = {
  rating: number;
  content: string;
};

export type RentalCreateInput = {
  itemId: number;
  chatRoomId: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
};

export type ReviewSubmission = {
  reviewState: ReviewState;
  reviewDeadline: string | null;
};
