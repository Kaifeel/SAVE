import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatalogItem } from '@/catalog/types';
import type { ResourceState } from './use-my-page';
import { getPublicItems, getPublicProfile, getPublicReviews } from './public-api';
import type { PublicReview, PublicUserProfile } from './public-schema';

type PublicResourceKey = 'profile' | 'items' | 'reviews';

type PublicResources = {
  profile: ResourceState<PublicUserProfile | null>;
  items: ResourceState<CatalogItem[]>;
  reviews: ResourceState<PublicReview[]>;
};

export type PublicProfileState = PublicResources & {
  refreshing: boolean;
  reload: (resource: PublicResourceKey) => Promise<void>;
  refresh: () => Promise<void>;
};

function initialResources(): PublicResources {
  return {
    profile: { data: null, loading: true, error: null },
    items: { data: [], loading: true, error: null },
    reviews: { data: [], loading: true, error: null },
  };
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function usePublicProfile(userId: number | null): PublicProfileState {
  const [resources, setResources] = useState<PublicResources>(initialResources);
  const [resourceUserId, setResourceUserId] = useState<number | null>(userId);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const activeUserId = useRef<number | null>(userId);
  const requestGeneration = useRef<Record<PublicResourceKey, number>>({
    profile: 0,
    items: 0,
    reviews: 0,
  });
  const refreshGeneration = useRef(0);

  activeUserId.current = userId;

  const begin = useCallback((resource: PublicResourceKey): number => {
    const generation = ++requestGeneration.current[resource];
    setResources(current => ({
      ...current,
      [resource]: { ...current[resource], loading: true, error: null },
    }));
    return generation;
  }, []);

  const current = useCallback((resource: PublicResourceKey, generation: number, id: number) => (
    mounted.current
    && activeUserId.current === id
    && requestGeneration.current[resource] === generation
  ), []);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    const generation = begin('profile');
    try {
      const data = await getPublicProfile(userId);
      if (current('profile', generation, userId)) {
        setResources(value => ({ ...value, profile: { data, loading: false, error: null } }));
      }
    } catch (error) {
      if (current('profile', generation, userId)) {
        setResources(value => ({
          ...value,
          profile: { ...value.profile, loading: false, error: message(error, '프로필을 불러오지 못했습니다.') },
        }));
      }
    }
  }, [begin, current, userId]);

  const loadItems = useCallback(async () => {
    if (!userId) return;
    const generation = begin('items');
    try {
      const data = await getPublicItems(userId);
      if (current('items', generation, userId)) {
        setResources(value => ({ ...value, items: { data, loading: false, error: null } }));
      }
    } catch (error) {
      if (current('items', generation, userId)) {
        setResources(value => ({
          ...value,
          items: { ...value.items, loading: false, error: message(error, '등록 물품을 불러오지 못했습니다.') },
        }));
      }
    }
  }, [begin, current, userId]);

  const loadReviews = useCallback(async () => {
    if (!userId) return;
    const generation = begin('reviews');
    try {
      const data = await getPublicReviews(userId);
      if (current('reviews', generation, userId)) {
        setResources(value => ({ ...value, reviews: { data, loading: false, error: null } }));
      }
    } catch (error) {
      if (current('reviews', generation, userId)) {
        setResources(value => ({
          ...value,
          reviews: { ...value.reviews, loading: false, error: message(error, '후기를 불러오지 못했습니다.') },
        }));
      }
    }
  }, [begin, current, userId]);

  const reload = useCallback((resource: PublicResourceKey): Promise<void> => {
    if (resource === 'profile') return loadProfile();
    if (resource === 'items') return loadItems();
    return loadReviews();
  }, [loadItems, loadProfile, loadReviews]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const generation = ++refreshGeneration.current;
    setRefreshing(true);
    await Promise.allSettled([loadProfile(), loadItems(), loadReviews()]);
    if (mounted.current && activeUserId.current === userId
      && refreshGeneration.current === generation) {
      setRefreshing(false);
    }
  }, [loadItems, loadProfile, loadReviews, userId]);

  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(async () => {
      setResourceUserId(userId);
      setResources(initialResources());
      setRefreshing(false);
      if (userId) {
        await Promise.allSettled([loadProfile(), loadItems(), loadReviews()]);
      }
    });
    return () => {
      mounted.current = false;
      requestGeneration.current.profile += 1;
      requestGeneration.current.items += 1;
      requestGeneration.current.reviews += 1;
      refreshGeneration.current += 1;
    };
  }, [loadItems, loadProfile, loadReviews, userId]);

  const visible = resourceUserId === userId ? resources : initialResources();
  return { ...visible, refreshing: resourceUserId === userId && refreshing, reload, refresh };
}
