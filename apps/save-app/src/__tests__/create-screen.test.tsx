import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as ImagePicker from 'expo-image-picker';
import CreateScreen from '@/app/(authenticated)/(tabs)/create';
import { useAuthStore } from '@/auth/store';
import { createItem, getItem, updateItem } from '@/catalog/api';
import { getPickupLocations } from '@/universities/api';
import { catalogItem } from '@/test-utils/catalog-fixtures';
import { COMMON_SAFETY_NOTICE } from '@/catalog/constants';

const mockReplace = jest.fn();
let mockEditItemId: string | undefined;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ itemId: mockEditItemId }),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('expo-image-picker', () => ({
  getPendingResultAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));

jest.mock('@/auth/store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/catalog/api', () => ({
  createItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
}));
jest.mock('@/universities/api', () => ({ getPickupLocations: jest.fn() }));

const useAuthStoreMock = jest.mocked(useAuthStore);
const createItemMock = jest.mocked(createItem);
const getItemMock = jest.mocked(getItem);
const updateItemMock = jest.mocked(updateItem);
const getPickupLocationsMock = jest.mocked(getPickupLocations);
const requestPermissionMock = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);
const requestCameraPermissionMock = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const launchCameraMock = jest.mocked(ImagePicker.launchCameraAsync);
const launchPickerMock = jest.mocked(ImagePicker.launchImageLibraryAsync);
const locations = [
  { id: 4, name: '도서관 앞' },
  { id: 5, name: '학생회관' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockEditItemId = undefined;
  useAuthStoreMock.mockImplementation(selector => selector({
    user: { universityId: 2 },
  } as never));
  getPickupLocationsMock.mockResolvedValue(locations);
  createItemMock.mockResolvedValue(catalogItem);
  getItemMock.mockResolvedValue(catalogItem);
  updateItemMock.mockResolvedValue(catalogItem);
  requestPermissionMock.mockResolvedValue({ granted: true } as never);
  requestCameraPermissionMock.mockResolvedValue({ granted: true } as never);
  launchCameraMock.mockResolvedValue({ canceled: true, assets: null });
  launchPickerMock.mockResolvedValue({ canceled: true, assets: null });
});

it('loads an owned item into the form and submits an update', async () => {
  mockEditItemId = String(catalogItem.id);
  await render(<CreateScreen />);

  expect(await screen.findByDisplayValue(catalogItem.title)).toBeTruthy();
  expect(screen.getByDisplayValue(String(catalogItem.rentalFee))).toBeTruthy();
  expect(screen.getByText('기존 사진은 그대로 유지됩니다.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '물품 수정' }));

  await waitFor(() => expect(updateItemMock).toHaveBeenCalledWith(
    catalogItem.id,
    expect.objectContaining({
      title: catalogItem.title,
      rentalFee: catalogItem.rentalFee,
      pickupLocationId: catalogItem.pickupLocationId,
    }),
  ));
  expect(createItemMock).not.toHaveBeenCalled();
});

async function selectLocation(name = '도서관 앞') {
  await fireEvent.press(await screen.findByRole('button', { name: '거래 장소 선택' }));
  await fireEvent.press(screen.getByRole('button', { name }));
}

async function fillRequiredFields() {
  await fireEvent.changeText(screen.getByLabelText('물품 이름'), 'USB-C 충전기');
  await fireEvent.changeText(screen.getByLabelText('대여 가격'), '0');
  await selectLocation();
}

it('submits the complete server-backed draft once and opens its detail', async () => {
  let resolveCreate!: (value: typeof catalogItem) => void;
  createItemMock.mockReturnValue(new Promise(resolve => { resolveCreate = resolve; }));
  await render(<CreateScreen />);
  await fillRequiredFields();
  await fireEvent.changeText(screen.getByLabelText('설명'), '정상 작동합니다.');
  expect(screen.getByText(COMMON_SAFETY_NOTICE)).toBeTruthy();
  expect(screen.queryByLabelText('주의사항')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: '물품 등록' }));
  await fireEvent.press(screen.getByRole('button', { name: '등록 중...' }));

  expect(createItemMock).toHaveBeenCalledTimes(1);
  expect(createItemMock).toHaveBeenCalledWith({
    type: 'LEND',
    title: 'USB-C 충전기',
    rentalFee: 0,
    rentalUnit: '일',
    pickupLocationId: 4,
    description: '정상 작동합니다.',
    precautions: COMMON_SAFETY_NOTICE,
    photos: [],
  });
  resolveCreate(catalogItem);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/items/[id]',
    params: { id: '7' },
  }));
});

it('keeps composing when gallery permission is denied', async () => {
  requestPermissionMock.mockResolvedValue({ granted: false } as never);
  await render(<CreateScreen />);

  await fireEvent.press(screen.getByRole('button', { name: '갤러리 선택' }));

  expect(await screen.findByText('사진 없이도 물품을 등록할 수 있습니다.')).toBeTruthy();
  expect(screen.getByLabelText('물품 이름')).toBeTruthy();
  expect(launchPickerMock).not.toHaveBeenCalled();
});

it('adds and removes a selected gallery photo without fixed photo data', async () => {
  launchPickerMock.mockResolvedValue({
    canceled: false,
    assets: [{
      uri: 'file:///selected.png',
      fileName: 'selected.png',
      mimeType: 'image/png',
      width: 100,
      height: 100,
      type: 'image',
    }],
  } as never);
  await render(<CreateScreen />);

  await fireEvent.press(screen.getByRole('button', { name: '갤러리 선택' }));

  expect(await screen.findByLabelText('선택한 사진 selected.png')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'selected.png 삭제' }));
  expect(screen.queryByLabelText('선택한 사진 selected.png')).toBeNull();
});

it('takes a photo with the native camera and adds its preview', async () => {
  launchCameraMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///camera.jpg', fileName: 'camera.jpg', mimeType: 'image/jpeg', width: 100, height: 100, type: 'image' }],
  } as never);
  await render(<CreateScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '카메라 촬영' }));
  expect(requestCameraPermissionMock).toHaveBeenCalledTimes(1);
  expect(await screen.findByLabelText('선택한 사진 camera.jpg')).toBeTruthy();
});

it('shows a pickup loading error and retries without fallback locations', async () => {
  getPickupLocationsMock
    .mockRejectedValueOnce(new Error('장소 서버 연결 실패'))
    .mockResolvedValueOnce(locations);
  await render(<CreateScreen />);

  expect(await screen.findByText('장소 서버 연결 실패')).toBeTruthy();
  expect(screen.queryByText('도서관 앞')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '거래 장소 다시 불러오기' }));

  await waitFor(() => expect(getPickupLocationsMock).toHaveBeenCalledTimes(2));
  await fireEvent.press(await screen.findByRole('button', { name: '거래 장소 선택' }));
  expect(screen.getByRole('button', { name: '도서관 앞' })).toBeTruthy();
});

it('preserves entered fields after a create failure', async () => {
  createItemMock.mockRejectedValue(new Error('물품 등록 서버 실패'));
  await render(<CreateScreen />);
  await fillRequiredFields();

  await fireEvent.press(screen.getByRole('button', { name: '물품 등록' }));

  expect(await screen.findByText('물품 등록 서버 실패')).toBeTruthy();
  expect(screen.getByDisplayValue('USB-C 충전기')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('blocks submission when no server pickup location exists', async () => {
  getPickupLocationsMock.mockResolvedValue([]);
  await render(<CreateScreen />);

  expect(await screen.findByText('등록된 거래 장소가 없습니다.')).toBeTruthy();
  expect(screen.getByRole('button', { name: '물품 등록' })).toBeDisabled();
  expect(createItemMock).not.toHaveBeenCalled();
});
