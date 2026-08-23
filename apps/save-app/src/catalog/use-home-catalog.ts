import { useCallback, useEffect, useState } from 'react';

import { createRecommendation, getRecommendationHistory, listItems } from './api';
import type { CatalogItem, RecommendationSummary } from './types';

type HomeCatalogState = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  popular: CatalogItem[];
  recent: CatalogItem[];
  recommendation: RecommendationSummary | null;
};

export function useHomeCatalog(universityId: number | null | undefined) {
  const [state, setState] = useState<HomeCatalogState>({
    loading: true,
    refreshing: false,
    error: null,
    popular: [],
    recent: [],
    recommendation: null,
  });

  const load = useCallback(async (refreshing = false) => {
    setState(current => ({ ...current, error: null, loading: !refreshing, refreshing }));
    try {
      const [popular, recent, history] = await Promise.all([
        listItems({ sort: 'popular', onlyAvailable: true, page: 0, size: 4, universityId }),
        listItems({ sort: 'latest', page: 0, size: 8, universityId }),
        getRecommendationHistory(),
      ]);
      setState({
        loading: false,
        refreshing: false,
        error: null,
        popular: popular.content,
        recent: recent.content,
        recommendation: history[0] ?? null,
      });
    } catch {
      setState(current => ({
        ...current,
        loading: false,
        refreshing: false,
        error: '물품을 불러오지 못했습니다. 네트워크를 확인해 주세요.',
        popular: [],
        recent: [],
      }));
    }
  }, [universityId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const requestRecommendation = useCallback(async (department: string) => {
    setState(current => ({ ...current, error: null }));
    try {
      const next = await createRecommendation({
        department,
        interestItems: [department],
        timePeriod: new Date().getHours() < 12 ? '오전' : '오후',
        isExamPeriod: false,
        weatherStatus: '알 수 없음',
      });
      setState(current => ({ ...current, recommendation: next }));
    } catch {
      setState(current => ({ ...current, error: 'AI 추천을 불러오지 못했습니다.' }));
    }
  }, []);

  return {
    ...state,
    retry: () => load(),
    refresh: () => load(true),
    requestRecommendation,
  };
}
