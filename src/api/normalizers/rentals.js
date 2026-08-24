import { unwrapObject } from './shared.js'

export function normalizeRental(response) {
  const rental = unwrapObject(response) || {}
  return {
    ...rental,
    id: rental.id ?? rental.rentalId ?? rental.rental_id,
    item_id: rental.item_id ?? rental.itemId,
    itemTitle: rental.item_title ?? rental.itemTitle,
    borrower_id: rental.borrower_id ?? rental.borrowerId,
    borrowerName: rental.borrower_name ?? rental.borrowerName,
    lender_id: rental.lender_id ?? rental.lenderId,
    lenderName: rental.lender_name ?? rental.lenderName,
    returnedAt: rental.returned_at ?? rental.returnedAt ?? null,
    reviewDeadline: rental.review_deadline ?? rental.reviewDeadline ?? null,
    reviewState: rental.review_state ?? rental.reviewState ?? 'NOT_AVAILABLE',
  }
}
