import type { Rental, RentalAction, RentalStatus, ReviewState } from './types';

export type RentalRole = 'lender' | 'borrower';

export const rentalStatusLabel: Record<RentalStatus, string> = {
  REQUESTED: '승인 필요',
  APPROVED: '전달 대기',
  PAID: '결제됨',
  RENTING: '대여 중',
  RETURN_REQUESTED: '반납 확인 필요',
  RETURNED: '거래 완료',
  REJECTED: '거절됨',
  CANCELED: '취소됨',
};

export const reviewStateLabel: Partial<Record<ReviewState, string>> = {
  SUBMITTED_WAITING: '상대방 후기 작성 대기 중',
  PUBLISHED: '후기가 공개되었습니다',
  EXPIRED: '후기 작성 기간이 종료되었습니다',
};

export const rentalActionLabel: Record<RentalAction, string> = {
  approve: '승인',
  handover: '물건 전달 완료',
  receive: '물품 수령 완료',
  'request-return': '반납 요청',
  reject: '거절',
  cancel: '요청 취소',
  return: '반납 확인',
};

export const rentalActionConfirmation: Record<RentalAction, string> = {
  approve: '대여를 승인하고 물품을 예약하시겠습니까?',
  handover: '실제로 물건을 전달하셨나요? 상대방의 수령 확인까지 완료되면 대여가 시작됩니다.',
  receive: '실제로 물품을 받으셨나요? 소유자의 전달 확인까지 완료되면 대여가 시작됩니다.',
  'request-return': '물품을 돌려주셨나요? 소유자에게 반납 확인을 요청합니다.',
  return: '반납된 물품을 확인하셨나요? 확인하면 거래가 완료되고 다시 대여할 수 있습니다.',
  reject: '이 대여 신청을 거절하시겠습니까?',
  cancel: '이 대여 신청을 취소하시겠습니까?',
};

export function rentalRole(rental: Rental, userId: number | null): RentalRole | null {
  if (rental.lenderId === userId) return 'lender';
  if (rental.borrowerId === userId) return 'borrower';
  return null;
}

export function availableActions(rental: Rental, role: RentalRole | null): RentalAction[] {
  if (role === 'lender' && rental.status === 'REQUESTED') return ['approve', 'reject'];
  if (role === 'lender' && rental.status === 'APPROVED') return rental.lenderHandedOverAt ? [] : ['handover'];
  if (role === 'lender' && rental.status === 'RETURN_REQUESTED') return ['return'];
  if (role === 'borrower' && rental.status === 'RENTING') return ['request-return'];
  if (role === 'borrower' && rental.status === 'REQUESTED') return ['cancel'];
  if (role === 'borrower' && rental.status === 'APPROVED') {
    if (rental.borrowerReceivedAt) return [];
    return rental.lenderHandedOverAt ? ['receive'] : ['receive', 'cancel'];
  }
  return [];
}

export function rentalWaitingMessage(rental: Rental, role: RentalRole | null): string | null {
  if (rental.status === 'APPROVED') {
    if (role === 'lender' && rental.lenderHandedOverAt) return '물건 전달 완료 · 상대방 수령 확인 대기';
    if (role === 'borrower' && rental.borrowerReceivedAt) return '물품 수령 완료 · 상대방 전달 확인 대기';
    return '물건 전달과 물품 수령을 양쪽 모두 확인하면 대여가 시작됩니다.';
  }
  if (rental.status === 'RETURN_REQUESTED' && role === 'borrower') return '반납 요청 완료 · 소유자 확인 대기';
  return null;
}

export function formatRentalDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!match) return value;
  const date = `${Number(match[1])}. ${Number(match[2])}. ${Number(match[3])}.`;
  return match[4] ? `${date} ${match[4]}:${match[5]}` : date;
}
