import {
  initialItemDraft,
  validateItemDraft,
  type ItemDraft,
} from './item-composer';
import type { ItemPhotoAsset } from './types';

const photo = (index: number): ItemPhotoAsset => ({
  uri: `file:///photo-${index}.jpg`,
  fileName: `photo-${index}.jpg`,
  mimeType: 'image/jpeg',
});

const validDraft: ItemDraft = {
  type: 'LEND',
  title: '충전기',
  rentalFee: '0',
  rentalUnit: '일',
  pickupLocationId: 4,
  description: '정상 작동합니다.',
  precautions: '케이블을 함께 반납해 주세요.',
  photos: [],
};

it.each([
  [{ title: '   ' }, '물품 이름을 입력해 주세요.'],
  [{ rentalFee: '-1' }, '대여 가격은 0 이상의 정수여야 합니다.'],
  [{ rentalFee: '1.5' }, '대여 가격은 0 이상의 정수여야 합니다.'],
  [{ rentalFee: 'abc' }, '대여 가격은 0 이상의 정수여야 합니다.'],
  [{ pickupLocationId: null }, '거래 장소를 선택해 주세요.'],
  [{ photos: [1, 2, 3, 4, 5, 6].map(photo) }, '사진은 최대 5장까지 등록할 수 있습니다.'],
] as const)('rejects invalid compose draft %#', (patch, message) => {
  expect(validateItemDraft({ ...validDraft, ...patch })).toEqual({ ok: false, message });
});

it('trims text and converts a valid fee for submission', () => {
  expect(validateItemDraft({
    ...validDraft,
    title: '  충전기  ',
    description: '  정상 작동합니다.  ',
    precautions: '  분실 주의  ',
    rentalFee: '0',
  })).toEqual({
    ok: true,
    input: {
      type: 'LEND',
      title: '충전기',
      rentalFee: 0,
      rentalUnit: '일',
      pickupLocationId: 4,
      description: '정상 작동합니다.',
      precautions: '분실 주의',
      photos: [],
    },
  });
});

it('returns a fresh draft and photo array for every mount', () => {
  const first = initialItemDraft();
  const second = initialItemDraft();

  first.photos.push(photo(1));
  first.title = '변경됨';

  expect(second).toEqual({
    type: 'LEND',
    title: '',
    rentalFee: '',
    rentalUnit: '일',
    pickupLocationId: null,
    description: '',
    precautions: '',
    photos: [],
  });
});
