import { apiRequest } from '@/api/client';
import { parseRental, parseRentals, parseReviewSubmission } from './schema';
import type {
  Rental,
  RentalAction,
  RentalReviewInput,
  ReviewSubmission,
} from './types';

function requireRentalId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid rental id');
  }
}

export async function getRental(id: number): Promise<Rental> {
  requireRentalId(id);
  return parseRental(await apiRequest<unknown>(`/rentals/${id}`));
}

export async function getMyRentals(): Promise<Rental[]> {
  return parseRentals(await apiRequest<unknown>('/rentals/me'));
}

export async function transitionRental(id: number, action: RentalAction): Promise<Rental> {
  requireRentalId(id);
  return parseRental(await apiRequest<unknown>(`/rentals/${id}/${action}`, {
    method: 'PATCH',
  }));
}

export async function submitRentalReview(
  id: number,
  input: RentalReviewInput,
): Promise<ReviewSubmission> {
  requireRentalId(id);
  const content = input.content.trim();
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 || !content) {
    throw new Error('별점과 후기를 모두 입력해 주세요.');
  }
  if (content.length > 500) {
    throw new Error('후기는 500자 이하로 입력해 주세요.');
  }
  return parseReviewSubmission(await apiRequest<unknown>(`/rentals/${id}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating: input.rating, content }),
  }));
}
