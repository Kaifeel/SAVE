import { render, screen } from '@testing-library/react-native';

import { PublicReviewSection } from './public-review-section';
import type { PublicReview } from '../public-schema';

function review(id: number, revieweeRole: PublicReview['revieweeRole']): PublicReview {
  return {
    id,
    rating: 5,
    content: '좋은 거래였습니다.',
    createdAt: '2026-08-24T10:00:00Z',
    itemId: 7,
    itemTitle: '군화',
    reviewerId: id + 10,
    reviewerName: '이용자',
    reviewerProfileImageUrl: null,
    revieweeRole,
  };
}

it('describes lender and borrower review roles as actions', async () => {
  await render(<PublicReviewSection
    onRetry={jest.fn()}
    resource={{
      data: [review(1, 'LENDER'), review(2, 'BORROWER')],
      loading: false,
      error: null,
    }}
  />);

  expect(screen.getByText('물품을 빌려주고 받은 후기')).toBeTruthy();
  expect(screen.getByText('물품을 빌리고 받은 후기')).toBeTruthy();
  expect(screen.queryByText('빌린 사람으로 받은 후기')).toBeNull();
});
