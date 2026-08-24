import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import { getRental, submitRentalReview, transitionRental } from './api';
import type { Rental, RentalAction, RentalReviewInput } from './types';

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useRentalDetail(rentalId: number | null) {
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(rentalId !== null);
  const [notFound, setNotFound] = useState(rentalId === null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const pending = useRef(false);

  const load = useCallback(async () => {
    if (!rentalId) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getRental(rentalId);
      if (mounted.current && generation.current === request) {
        setRental(data);
        setNotFound(false);
      }
    } catch (reason) {
      if (!mounted.current || generation.current !== request) return;
      setRental(null);
      if (reason instanceof ApiError && reason.status === 404) setNotFound(true);
      else setError(message(reason, '대여 정보를 불러오지 못했습니다.'));
    } finally {
      if (mounted.current && generation.current === request) setLoading(false);
    }
  }, [rentalId]);

  const run = useCallback(async (action: RentalAction) => {
    if (!rentalId || pending.current) return false;
    pending.current = true;
    setPendingAction(action);
    setError(null);
    try {
      const updated = await transitionRental(rentalId, action);
      if (!mounted.current) return false;
      setRental(updated);
      return true;
    } catch (reason) {
      if (mounted.current) setError(message(reason, '대여 상태를 변경하지 못했습니다.'));
      return false;
    } finally {
      pending.current = false;
      if (mounted.current) setPendingAction(null);
    }
  }, [rentalId]);

  const submitReview = useCallback(async (input: RentalReviewInput) => {
    if (!rentalId || pending.current) return false;
    pending.current = true;
    setPendingAction('review');
    setError(null);
    try {
      const result = await submitRentalReview(rentalId, input);
      if (!mounted.current) return false;
      setRental(current => current ? {
        ...current,
        reviewState: result.reviewState,
        reviewDeadline: result.reviewDeadline,
      } : current);
      return true;
    } catch (reason) {
      if (mounted.current) setError(message(reason, '후기를 제출하지 못했습니다.'));
      return false;
    } finally {
      pending.current = false;
      if (mounted.current) setPendingAction(null);
    }
  }, [rentalId]);

  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => load());
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, [load]);

  return { rental, loading, notFound, error, pendingAction, reload: load, run, submitReview };
}
