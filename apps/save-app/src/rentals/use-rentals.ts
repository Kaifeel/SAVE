import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getMyRentals, submitRentalReview, transitionRental } from './api';
import type { Rental, RentalAction, RentalReviewInput } from './types';

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useRentals(currentUserId: number | null) {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const mounted = useRef(true);
  const requestGeneration = useRef(0);
  const pending = useRef<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    const generation = ++requestGeneration.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyRentals();
      if (mounted.current && requestGeneration.current === generation) setRentals(data);
    } catch (reason) {
      if (mounted.current && requestGeneration.current === generation) {
        setError(message(reason, '대여 내역을 불러오지 못했습니다.'));
      }
    } finally {
      if (mounted.current && requestGeneration.current === generation) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const run = useCallback(async (id: number, action: RentalAction) => {
    const key = `${id}:${action}`;
    if (pending.current) return null;
    pending.current = key;
    setPendingAction(key);
    setActionError(null);
    try {
      const updated = await transitionRental(id, action);
      if (mounted.current) {
        setRentals(current => current.map(value => value.id === id ? updated : value));
      }
      return updated;
    } catch (reason) {
      if (mounted.current) setActionError(message(reason, '대여 상태를 변경하지 못했습니다.'));
      return null;
    } finally {
      pending.current = null;
      if (mounted.current) setPendingAction(null);
    }
  }, []);

  const submitReview = useCallback(async (id: number, input: RentalReviewInput) => {
    const key = `${id}:review`;
    if (pending.current) return false;
    pending.current = key;
    setPendingAction(key);
    setActionError(null);
    try {
      const result = await submitRentalReview(id, input);
      if (mounted.current) {
        setRentals(current => current.map(value => value.id === id ? {
          ...value,
          reviewState: result.reviewState,
          reviewDeadline: result.reviewDeadline,
        } : value));
      }
      return true;
    } catch (reason) {
      if (mounted.current) setActionError(message(reason, '후기를 제출하지 못했습니다.'));
      return false;
    } finally {
      pending.current = null;
      if (mounted.current) setPendingAction(null);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => load());
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
    };
  }, [load]);

  const sent = useMemo(
    () => rentals.filter(rental => rental.borrowerId === currentUserId),
    [currentUserId, rentals],
  );
  const received = useMemo(
    () => rentals.filter(rental => rental.lenderId === currentUserId),
    [currentUserId, rentals],
  );

  return {
    rentals,
    sent,
    received,
    loading,
    refreshing,
    error,
    actionError,
    pendingAction,
    reload: () => load(false),
    refresh: () => load(true),
    run,
    submitReview,
    clearActionError: () => setActionError(null),
  };
}
