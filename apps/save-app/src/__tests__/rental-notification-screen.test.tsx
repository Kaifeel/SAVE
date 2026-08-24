import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RentalDetailScreen from '@/app/(authenticated)/rentals/[id]';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/auth/store';
import { getRental, submitRentalReview, transitionRental } from '@/rentals/api';
import type { Rental } from '@/rentals/types';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockRouteId = '41';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock('@/rentals/api', () => ({
  getRental: jest.fn(),
  submitRentalReview: jest.fn(),
  transitionRental: jest.fn(),
}));

const getRentalMock = jest.mocked(getRental);
const transitionMock = jest.mocked(transitionRental);
const rental: Rental = {
  id: 41,
  itemId: 7,
  itemTitle: '군화',
  borrowerId: 17,
  borrowerName: '대여학생',
  lenderId: 3,
  lenderName: '물품주인',
  chatRoomId: 12,
  status: 'REQUESTED',
  startDate: '2026-08-24T09:00:00',
  endDate: '2026-08-26T18:00:00',
  totalPrice: 6000,
  createdAt: '2026-08-23T10:00:00',
  updatedAt: '2026-08-23T10:05:00',
  returnedAt: null,
  reviewDeadline: null,
  reviewState: 'NOT_AVAILABLE',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteId = '41';
  useAuthStore.setState({
    status: 'authenticated',
    user: {
      id: 3, email: 'lender@example.com', name: '대여자', department: null,
      universityId: 1, universityName: '부경대학교', profileImageUrl: null, role: 'USER',
    },
  });
  getRentalMock.mockResolvedValue(rental);
  transitionMock.mockResolvedValue({ ...rental, status: 'RENTING' });
  jest.mocked(submitRentalReview).mockResolvedValue({
    reviewState: 'SUBMITTED_WAITING', reviewDeadline: null,
  });
});

it('renders API-provided detail and links to the real item and chat', async () => {
  await render(<RentalDetailScreen />);

  expect(await screen.findByText('대여 #41')).toBeTruthy();
  expect(screen.getByText('군화')).toBeTruthy();
  expect(screen.getByText('신청자')).toBeTruthy();
  expect(screen.getByText('대여학생')).toBeTruthy();
  expect(screen.getByText('요청됨')).toBeTruthy();
  expect(screen.getByText('6,000원')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '물품 상세' }));
  await fireEvent.press(screen.getByRole('button', { name: '거래 채팅' }));
  expect(mockPush).toHaveBeenNthCalledWith(1, { pathname: '/items/[id]', params: { id: '7' } });
  expect(mockPush).toHaveBeenNthCalledWith(2, { pathname: '/chats/[id]', params: { id: '12' } });
});

it('confirms and performs only a role-allowed transition', async () => {
  let confirm: (() => void) | undefined;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    confirm = buttons?.[1]?.onPress;
  });
  await render(<RentalDetailScreen />);
  await screen.findByText('대여 #41');

  await fireEvent.press(screen.getByRole('button', { name: '거래 시작' }));
  await act(async () => { confirm?.(); });
  await waitFor(() => expect(transitionMock).toHaveBeenCalledWith(41, 'start'));
  expect(await screen.findByText('대여 중')).toBeTruthy();
  alert.mockRestore();
});

it('shows a neutral not-found state for an invalid route or 404', async () => {
  mockRouteId = 'invalid';
  const view = await render(<RentalDetailScreen />);
  expect(await screen.findByText('대여 정보를 찾을 수 없습니다.')).toBeTruthy();
  expect(getRentalMock).not.toHaveBeenCalled();

  mockRouteId = '41';
  getRentalMock.mockRejectedValue(new ApiError('missing', 404));
  await view.unmount();
  await render(<RentalDetailScreen />);
  expect(await screen.findByText('대여 정보를 찾을 수 없습니다.')).toBeTruthy();
});

it('offers a retry after a temporary loading failure', async () => {
  getRentalMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(rental);
  await render(<RentalDetailScreen />);

  expect(await screen.findByRole('alert')).toHaveTextContent('offline');
  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
  expect(await screen.findByText('대여 #41')).toBeTruthy();
  expect(getRentalMock).toHaveBeenCalledTimes(2);
});
