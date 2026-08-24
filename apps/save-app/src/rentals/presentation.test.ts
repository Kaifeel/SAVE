import { availableActions, formatRentalDate, rentalRole } from './presentation';
import { backendRental } from './schema.test';
import { parseRental } from './schema';

const rental = parseRental({ ...backendRental, status: 'REQUESTED' });

it('derives role and exposes only backend-supported actions', () => {
  expect(rentalRole(rental, 3)).toBe('lender');
  expect(rentalRole(rental, 17)).toBe('borrower');
  expect(availableActions(rental, 'lender')).toEqual(['start', 'reject']);
  expect(availableActions(rental, 'borrower')).toEqual(['cancel']);
  expect(availableActions({ ...rental, status: 'RENTING' }, 'lender')).toEqual(['return']);
  expect(availableActions({ ...rental, status: 'RETURNED' }, 'lender')).toEqual([]);
});

it('formats backend dates without locale-dependent parsing', () => {
  expect(formatRentalDate('2026-08-24T09:05:00')).toBe('2026. 8. 24. 09:05');
  expect(formatRentalDate('unknown')).toBe('unknown');
});
