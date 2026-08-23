import { apiRequest } from '@/api/client';
import { getRental } from './api';
import { backendRental } from './schema.test';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

it('loads and validates one authorized rental', async () => {
  apiRequestMock.mockResolvedValue(backendRental);

  await expect(getRental(41)).resolves.toEqual(expect.objectContaining({ id: 41, itemId: 7 }));
  expect(apiRequestMock).toHaveBeenCalledWith('/rentals/41');
});
