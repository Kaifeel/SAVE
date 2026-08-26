import type {
  CatalogItemType,
  CreateItemInput,
  ItemPhotoAsset,
} from './types';
import { COMMON_SAFETY_NOTICE } from './constants';

export type ItemDraft = {
  type: CatalogItemType;
  title: string;
  rentalFee: string;
  rentalUnit: '일' | '시간';
  pickupLocationId: number | null;
  description: string;
  precautions: string;
  photos: ItemPhotoAsset[];
};

export type ItemDraftValidation =
  | { ok: true; input: CreateItemInput }
  | { ok: false; message: string };

export function initialItemDraft(): ItemDraft {
  return {
    type: 'LEND',
    title: '',
    rentalFee: '',
    rentalUnit: '일',
    pickupLocationId: null,
    description: '',
    precautions: COMMON_SAFETY_NOTICE,
    photos: [],
  };
}

export function validateItemDraft(draft: ItemDraft): ItemDraftValidation {
  const title = draft.title.trim();
  if (!title) {
    return { ok: false, message: '물품 이름을 입력해 주세요.' };
  }

  if (!/^\d+$/.test(draft.rentalFee)) {
    return { ok: false, message: '대여 가격은 0 이상의 정수여야 합니다.' };
  }
  const rentalFee = Number(draft.rentalFee);
  if (!Number.isSafeInteger(rentalFee)) {
    return { ok: false, message: '대여 가격은 0 이상의 정수여야 합니다.' };
  }

  if (!draft.pickupLocationId || !Number.isInteger(draft.pickupLocationId)) {
    return { ok: false, message: '거래 장소를 선택해 주세요.' };
  }
  if (draft.photos.length > 5) {
    return { ok: false, message: '사진은 최대 5장까지 등록할 수 있습니다.' };
  }

  return {
    ok: true,
    input: {
      type: draft.type,
      title,
      rentalFee,
      rentalUnit: draft.rentalUnit,
      pickupLocationId: draft.pickupLocationId,
      description: draft.description.trim(),
      precautions: COMMON_SAFETY_NOTICE,
      photos: [...draft.photos],
    },
  };
}
