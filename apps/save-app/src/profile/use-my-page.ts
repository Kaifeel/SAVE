import { useCallback, useEffect, useRef, useState } from 'react';

import type { AuthUser } from '@/auth/types';
import type { CatalogItem } from '@/catalog/types';
import { getMyItems, getMyProfile, getMyWishlist } from './api';

export type ResourceKey = 'profile' | 'items' | 'wishlist';

export type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

type Resources = {
  profile: ResourceState<AuthUser | null>;
  items: ResourceState<CatalogItem[]>;
  wishlist: ResourceState<CatalogItem[]>;
};

export type MyPageState = Resources & {
  refreshing: boolean;
  reload: (resource: ResourceKey) => Promise<void>;
  refresh: () => Promise<void>;
};

const initialResources = (): Resources => ({
  profile: { data: null, loading: true, error: null },
  items: { data: [], loading: true, error: null },
  wishlist: { data: [], loading: true, error: null },
});

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useMyPage(): MyPageState {
  const [resources, setResources] = useState<Resources>(initialResources);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const requestGeneration = useRef<Record<ResourceKey, number>>({
    profile: 0,
    items: 0,
    wishlist: 0,
  });
  const refreshGeneration = useRef(0);

  const begin = useCallback((resource: ResourceKey): number => {
    const generation = ++requestGeneration.current[resource];
    setResources(current => ({
      ...current,
      [resource]: { ...current[resource], loading: true, error: null },
    }));
    return generation;
  }, []);

  const isCurrent = useCallback((resource: ResourceKey, generation: number) => (
    mounted.current && requestGeneration.current[resource] === generation
  ), []);

  const loadProfile = useCallback(async () => {
    const generation = begin('profile');
    try {
      const data = await getMyProfile();
      if (isCurrent('profile', generation)) {
        setResources(current => ({
          ...current,
          profile: { data, loading: false, error: null },
        }));
      }
    } catch (error) {
      if (isCurrent('profile', generation)) {
        setResources(current => ({
          ...current,
          profile: {
            ...current.profile,
            loading: false,
            error: errorMessage(error, '프로필을 불러오지 못했습니다.'),
          },
        }));
      }
    }
  }, [begin, isCurrent]);

  const loadItems = useCallback(async () => {
    const generation = begin('items');
    try {
      const data = await getMyItems();
      if (isCurrent('items', generation)) {
        setResources(current => ({
          ...current,
          items: { data, loading: false, error: null },
        }));
      }
    } catch (error) {
      if (isCurrent('items', generation)) {
        setResources(current => ({
          ...current,
          items: {
            ...current.items,
            loading: false,
            error: errorMessage(error, '등록 물품을 불러오지 못했습니다.'),
          },
        }));
      }
    }
  }, [begin, isCurrent]);

  const loadWishlist = useCallback(async () => {
    const generation = begin('wishlist');
    try {
      const data = await getMyWishlist();
      if (isCurrent('wishlist', generation)) {
        setResources(current => ({
          ...current,
          wishlist: { data, loading: false, error: null },
        }));
      }
    } catch (error) {
      if (isCurrent('wishlist', generation)) {
        setResources(current => ({
          ...current,
          wishlist: {
            ...current.wishlist,
            loading: false,
            error: errorMessage(error, '찜 목록을 불러오지 못했습니다.'),
          },
        }));
      }
    }
  }, [begin, isCurrent]);

  const reload = useCallback((resource: ResourceKey): Promise<void> => {
    if (resource === 'profile') return loadProfile();
    if (resource === 'items') return loadItems();
    return loadWishlist();
  }, [loadItems, loadProfile, loadWishlist]);

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    setRefreshing(true);
    await Promise.allSettled([loadProfile(), loadItems(), loadWishlist()]);
    if (mounted.current && refreshGeneration.current === generation) {
      setRefreshing(false);
    }
  }, [loadItems, loadProfile, loadWishlist]);

  useEffect(() => {
    mounted.current = true;
    const generations = requestGeneration.current;
    void Promise.resolve().then(() => Promise.allSettled([
      loadProfile(),
      loadItems(),
      loadWishlist(),
    ]));
    return () => {
      mounted.current = false;
      generations.profile += 1;
      generations.items += 1;
      generations.wishlist += 1;
      refreshGeneration.current += 1;
    };
  }, [loadItems, loadProfile, loadWishlist]);

  return { ...resources, refreshing, reload, refresh };
}
