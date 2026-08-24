import type { Rental, RentalAction, RentalStatus, ReviewState } from './types';

export type RentalRole = 'lender' | 'borrower';

export const rentalStatusLabel: Record<RentalStatus, string> = {
  REQUESTED: '요청됨',
  APPROVED: '승인됨',
  PAID: '결제됨',
  RENTING: '대여 중',
  RETURNED: '반납됨',
  REJECTED: '거절됨',
  CANCELED: '취소됨',
};

export const reviewStateLabel: Partial<Record<ReviewState, string>> = {
  SUBMITTED_WAITING: '상대방 후기 작성 대기 중',
  PUBLISHED: '후기가 공개되었습니다',
  EXPIRED: '후기 작성 기간이 종료되었습니다',
};

export const rentalActionLabel: Record<RentalAction, string> = {
  start: '거래 시작',
  reject: '거절',
  cancel: '요청 취소',
  return: '반납 완료',
};

export function rentalRole(rental: Rental, userId: number | null): RentalRole | null {
  if (rental.lenderId === userId) return 'lender';
  if (rental.borrowerId === userId) return 'borrower';
  return null;
}

export function availableActions(rental: Rental, role: RentalRole | null): RentalAction[] {
  if (role === 'lender' && rental.status === 'REQUESTED') return ['start', 'reject'];
  if (role === 'lender' && rental.status === 'RENTING') return ['return'];
  if (role === 'borrower' && (rental.status === 'REQUESTED' || rental.status === 'APPROVED')) {
    return ['cancel'];
  }
  return [];
}

export function formatRentalDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!match) return value;
  const date = `${Number(match[1])}. ${Number(match[2])}. ${Number(match[3])}.`;
  return match[4] ? `${date} ${match[4]}:${match[5]}` : date;
}
