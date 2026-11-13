import { availableActions, formatRentalDate, rentalRole } from './presentation';
import { backendRental } from './schema.test';
import { parseRental } from './schema';

const rental = parseRental({ ...backendRental, status: 'REQUESTED' });

it('derives role and exposes only backend-supported actions', () => {
  expect(rentalRole(rental, 3)).toBe('lender');
  expect(rentalRole(rental, 17)).toBe('borrower');
  expect(availableActions(rental, 'lender')).toEqual(['approve', 'reject']);
  expect(availableActions(rental, 'borrower')).toEqual(['cancel']);
  expect(availableActions({ ...rental, status: 'RENTING' }, 'lender')).toEqual([]);
  expect(availableActions({ ...rental, status: 'RENTING' }, 'borrower')).toEqual(['request-return']);
  expect(availableActions({ ...rental, status: 'RETURN_REQUESTED' }, 'lender')).toEqual(['return']);
  expect(availableActions({ ...rental, status: 'RETURNED' }, 'lender')).toEqual([]);
});

it('requires each participant to confirm delivery and hides completed confirmations', () => {
  const approved = { ...rental, status: 'APPROVED' as const };
  expect(availableActions(approved, 'lender')).toEqual(['handover']);
  expect(availableActions(approved, 'borrower')).toEqual(['receive', 'cancel']);
  const handed = { ...approved, lenderHandedOverAt: '2026-09-11T10:00:00Z' };
  expect(availableActions(handed, 'lender')).toEqual([]);
  expect(availableActions(handed, 'borrower')).toEqual(['receive']);
  const received = { ...approved, borrowerReceivedAt: '2026-09-11T10:00:00Z' };
  expect(availableActions(received, 'borrower')).toEqual([]);
  expect(availableActions(received, 'lender')).toEqual(['handover']);
});

it('formats backend dates without locale-dependent parsing', () => {
  expect(formatRentalDate('2026-08-24T09:05:00')).toBe('2026. 8. 24. 09:05');
  expect(formatRentalDate('unknown')).toBe('unknown');
});
