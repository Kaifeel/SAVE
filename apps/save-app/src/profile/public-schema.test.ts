import { backendItem } from '@/catalog/schema.test';
import { parsePublicItems, parsePublicProfile, parsePublicReviews } from './public-schema';

const backendProfile = {
  id: 3,
  name: '김세이브',
  department: '컴퓨터공학과',
  university_id: 1,
  university_name: '부경대학교',
  profile_image_url: null,
  rating: 4.5,
  review_count: 8,
  completed_trade_count: 12,
};

const backendReview = {
  id: 9,
  rating: 5,
  content: '좋은 거래였습니다.',
  created_at: '2026-08-24T10:00:00Z',
  item_id: 7,
  item_title: '삼각대',
  reviewer_id: 17,
  reviewer_name: '이용자',
  reviewer_profile_image_url: null,
  reviewee_role: 'LENDER',
};

it('normalizes the complete public profile resources', () => {
  expect(parsePublicProfile(backendProfile)).toEqual(expect.objectContaining({
    id: 3,
    rating: 4.5,
    completedTradeCount: 12,
  }));
  expect(parsePublicItems([backendItem])).toEqual([expect.objectContaining({ id: 7 })]);
  expect(parsePublicReviews([backendReview])).toEqual([expect.objectContaining({
    id: 9,
    revieweeRole: 'LENDER',
  })]);
});

it.each([
  [{ ...backendProfile, rating: 6 }],
  [{ ...backendProfile, completed_trade_count: -1 }],
  [{ ...backendProfile, name: '' }],
])('rejects malformed public profile data', payload => {
  expect(() => parsePublicProfile(payload)).toThrow('public profile');
});

it('rejects malformed review roles and non-array collections', () => {
  expect(() => parsePublicReviews([{ ...backendReview, reviewee_role: 'OWNER' }]))
    .toThrow('reviewee_role');
  expect(() => parsePublicItems({ content: [] })).toThrow('items');
});
