import { apiRequest } from '@/api/client';
import { parseRental } from './schema';
import type { Rental } from './types';

export async function getRental(id: number): Promise<Rental> {
  return parseRental(await apiRequest<unknown>(`/rentals/${id}`));
}
