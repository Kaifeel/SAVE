import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { manipulateAsync } from 'expo-image-manipulator';
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

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
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
const manipulateAsyncMock = jest.mocked(manipulateAsync);
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
  manipulateAsyncMock.mockResolvedValue({
    uri: 'file:///cache/normalized.jpg',
    width: 100,
    height: 100,
  });
});

it('loads an owned item into the form and submits an update', async () => {
  mockEditItemId = String(catalogItem.id);
  getItemMock.mockResolvedValue({
    ...catalogItem,
    imageUrls: ['https://signed.example/items/existing.jpg'],
  });
  await render(<CreateScreen />);

  expect(await screen.findByDisplayValue(catalogItem.title)).toBeTruthy();
  expect(screen.getByLabelText('기존 사진 1')).toBeTruthy();
  expect(screen.getByDisplayValue(String(catalogItem.rentalFee))).toBeTruthy();
  expect(screen.getByText(
    '새 사진을 선택하지 않으면 기존 사진이 유지되고, 선택하면 교체됩니다.',
  )).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '물품 수정' }));

  await waitFor(() => expect(updateItemMock).toHaveBeenCalledWith(
    catalogItem.id,
    expect.objectContaining({
      title: catalogItem.title,
      rentalFee: catalogItem.rentalFee,
      pickupLocationId: catalogItem.pickupLocationId,
      photos: [],
    }),
  ));
  expect(createItemMock).not.toHaveBeenCalled();
});

it('shows camera and gallery actions when an existing item has no photos', async () => {
  mockEditItemId = String(catalogItem.id);
  getItemMock.mockResolvedValue({ ...catalogItem, imageUrls: [] });
  await render(<CreateScreen />);

  expect(await screen.findByDisplayValue(catalogItem.title)).toBeTruthy();
  expect(screen.getByText('사진 0장')).toBeTruthy();
  expect(screen.getByRole('button', { name: '카메라 촬영' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '갤러리 선택' })).toBeTruthy();
});

it('replaces existing photos when an owner selects a new camera photo', async () => {
  const cameraPhoto = {
    uri: 'file:///replacement.heic',
    fileName: 'replacement.heic',
    mimeType: 'image/heic',
    width: 100,
    height: 100,
    type: 'image',
  };
  mockEditItemId = String(catalogItem.id);
  launchCameraMock.mockResolvedValue({
    canceled: false,
    assets: [cameraPhoto],
  } as never);
  await render(<CreateScreen />);

  expect(await screen.findByDisplayValue(catalogItem.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '카메라 촬영' }));
  expect(await screen.findByLabelText('선택한 사진 normalized-1.jpg')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '물품 수정' }));

  await waitFor(() => expect(updateItemMock).toHaveBeenCalledWith(
    catalogItem.id,
    expect.objectContaining({
      photos: [expect.objectContaining({
        uri: 'file:///cache/normalized.jpg',
        fileName: 'normalized-1.jpg',
        mimeType: 'image/jpeg',
      })],
    }),
  ));
});

it('restores the existing preview when every replacement photo is removed', async () => {
  mockEditItemId = String(catalogItem.id);
  getItemMock.mockResolvedValue({
    ...catalogItem,
    imageUrls: ['https://signed.example/items/existing.jpg'],
  });
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

  expect(await screen.findByLabelText('기존 사진 1')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '갤러리 선택' }));
  expect(await screen.findByLabelText('선택한 사진 normalized-1.jpg')).toBeTruthy();
  expect(screen.queryByLabelText('기존 사진 1')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'normalized-1.jpg 삭제' }));
  expect(screen.getByLabelText('기존 사진 1')).toBeTruthy();
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

it('normalizes and removes a selected gallery photo without fixed photo data', async () => {
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

  expect(await screen.findByLabelText('선택한 사진 normalized-1.jpg')).toBeTruthy();
  expect(manipulateAsyncMock).toHaveBeenCalledWith(
    'file:///selected.png',
    [],
    { compress: 0.85, format: 'jpeg' },
  );
  await fireEvent.press(screen.getByRole('button', { name: 'normalized-1.jpg 삭제' }));
  expect(screen.queryByLabelText('선택한 사진 normalized-1.jpg')).toBeNull();
});

it('normalizes a native camera photo before adding its preview', async () => {
  launchCameraMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///camera.avif', fileName: null, mimeType: 'image/avif', width: 100, height: 100, type: 'image' }],
  } as never);
  await render(<CreateScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '카메라 촬영' }));
  expect(requestCameraPermissionMock).toHaveBeenCalledTimes(1);
  expect(await screen.findByLabelText('선택한 사진 normalized-1.jpg')).toBeTruthy();
});

it('does not add an original photo when JPEG normalization fails', async () => {
  launchCameraMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///camera.raw', fileName: null, mimeType: null, width: 100, height: 100, type: 'image' }],
  } as never);
  manipulateAsyncMock.mockRejectedValue(new Error('unsupported image'));
  await render(<CreateScreen />);

  await fireEvent.press(screen.getByRole('button', { name: '카메라 촬영' }));

  expect(await screen.findByText('사진을 JPEG로 변환하지 못했습니다. 다른 사진을 선택해 주세요.')).toBeTruthy();
  expect(screen.queryByLabelText(/선택한 사진/)).toBeNull();
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
