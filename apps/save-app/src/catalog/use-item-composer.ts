import { useCallback, useEffect, useRef, useState } from 'react';

import { getPickupLocations, type PickupLocation } from '@/universities/api';
import { createItem } from './api';
import {
  initialItemDraft,
  validateItemDraft,
  type ItemDraft,
} from './item-composer';
import type { CatalogItem, ItemPhotoAsset } from './types';

export type UseItemComposerResult = {
  draft: ItemDraft;
  locations: PickupLocation[];
  locationsLoading: boolean;
  locationError: string | null;
  submitError: string | null;
  photoNotice: string | null;
  submitting: boolean;
  setField: <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => void;
  addPhotos: (photos: ItemPhotoAsset[]) => void;
  removePhoto: (uri: string) => void;
  retryLocations: () => Promise<void>;
  submit: () => Promise<CatalogItem | null>;
};

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useItemComposer(
  universityId: number | null | undefined,
): UseItemComposerResult {
  const [draft, setDraft] = useState<ItemDraft>(() => initialItemDraft());
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const locationRequest = useRef(0);
  const submittingRef = useRef(false);
  const mounted = useRef(true);

  const loadLocations = useCallback(async () => {
    const request = ++locationRequest.current;
    if (!universityId) {
      setLocations([]);
      setLocationsLoading(false);
      setLocationError('대학교 정보가 없어 거래 장소를 불러올 수 없습니다.');
      return;
    }

    setLocationsLoading(true);
    setLocationError(null);
    try {
      const next = await getPickupLocations(universityId);
      if (mounted.current && request === locationRequest.current) {
        setLocations(next);
      }
    } catch (error) {
      if (mounted.current && request === locationRequest.current) {
        setLocations([]);
        setLocationError(message(error, '거래 장소를 불러오지 못했습니다.'));
      }
    } finally {
      if (mounted.current && request === locationRequest.current) {
        setLocationsLoading(false);
      }
    }
  }, [universityId]);

  useEffect(() => {
    mounted.current = true;
    void loadLocations();
    return () => {
      mounted.current = false;
      locationRequest.current += 1;
    };
  }, [loadLocations]);

  const setField = useCallback(<K extends keyof ItemDraft>(
    key: K,
    value: ItemDraft[K],
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
    setSubmitError(null);
  }, []);

  const addPhotos = useCallback((photos: ItemPhotoAsset[]) => {
    setDraft(current => {
      const knownUris = new Set(current.photos.map(photo => photo.uri));
      const unique = photos.filter(photo => !knownUris.has(photo.uri));
      const combined = [...current.photos, ...unique];
      setPhotoNotice(combined.length > 5
        ? '사진은 최대 5장까지 등록할 수 있습니다.'
        : null);
      return { ...current, photos: combined.slice(0, 5) };
    });
  }, []);

  const removePhoto = useCallback((uri: string) => {
    setDraft(current => ({
      ...current,
      photos: current.photos.filter(photo => photo.uri !== uri),
    }));
    setPhotoNotice(null);
  }, []);

  const submit = useCallback(async (): Promise<CatalogItem | null> => {
    if (submittingRef.current) {
      return null;
    }

    const validation = validateItemDraft(draft);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return null;
    }
    if (!locations.some(location => location.id === validation.input.pickupLocationId)) {
      setSubmitError('서버에서 제공한 거래 장소를 선택해 주세요.');
      return null;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      return await createItem(validation.input);
    } catch (error) {
      if (mounted.current) {
        setSubmitError(message(error, '물품 등록에 실패했습니다.'));
      }
      return null;
    } finally {
      submittingRef.current = false;
      if (mounted.current) {
        setSubmitting(false);
      }
    }
  }, [draft, locations]);

  return {
    draft,
    locations,
    locationsLoading,
    locationError,
    submitError,
    photoNotice,
    submitting,
    setField,
    addPhotos,
    removePhoto,
    retryLocations: loadLocations,
    submit,
  };
}
