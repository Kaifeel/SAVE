import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { getItem, setWishlist } from './api';
import type { CatalogItem } from './types';

export function useItemDetail(id: number | null) {
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(id !== null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(id === null);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id === null) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItem(await getItem(id));
      setNotFound(false);
    } catch (requestError) {
      setItem(null);
      if (requestError instanceof ApiError && requestError.status === 404) {
        setNotFound(true);
      } else {
        setError('물품 정보를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const toggleWishlist = useCallback(async () => {
    if (!item || wishlistPending) return;
    setWishlistPending(true);
    setWishlistError(null);
    try {
      await setWishlist(item.id, !item.wishlisted);
      setItem(await getItem(item.id));
    } catch {
      try {
        setItem(await getItem(item.id));
      } catch {
        // Keep the last validated item when authoritative refresh is unavailable.
      }
      setWishlistError('찜 상태를 변경하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setWishlistPending(false);
    }
  }, [item, wishlistPending]);

  return {
    item,
    loading,
    error,
    notFound,
    wishlistPending,
    wishlistError,
    retry: load,
    toggleWishlist,
  };
}
