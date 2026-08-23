import type { CatalogItem } from './types';

const rentalUnitLabels: Record<string, string> = {
  HOUR: '시간',
  DAY: '일',
  WEEK: '주',
  MONTH: '월',
};

export function formatFee(item: Pick<CatalogItem, 'rentalFee' | 'rentalUnit'>): string {
  if (item.rentalFee === 0) {
    return '무료';
  }
  return `${item.rentalFee.toLocaleString('ko-KR')}원/${rentalUnitLabels[item.rentalUnit] ?? item.rentalUnit}`;
}

export function formatRelativeTime(createdAt: string, now = Date.now()): string {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) {
    return '';
  }
  const minutes = Math.max(0, Math.floor((now - created) / 60_000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
