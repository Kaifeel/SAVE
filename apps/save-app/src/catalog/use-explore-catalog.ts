import { useCallback, useEffect, useState } from 'react';

import { listItems } from './api';
import type { CatalogItem, CatalogItemType } from './types';

export function useExploreCatalog(
  initialQuery: string,
  universityId: number | null | undefined,
) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<CatalogItemType>('LEND');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listItems({
        type,
        query: query.trim(),
        onlyAvailable,
        sort: 'latest',
        page: 0,
        size: 20,
        universityId,
      });
      setItems(page.content);
    } catch {
      setItems([]);
      setError('물품을 불러오지 못했습니다. 네트워크를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [onlyAvailable, query, type, universityId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  return {
    query,
    setQuery,
    type,
    setType,
    onlyAvailable,
    setOnlyAvailable,
    items,
    loading,
    error,
    retry: load,
  };
}
