import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clearRefreshToken, readRefreshToken, writeRefreshToken } from './secure-session';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);
const deleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);
const nativePlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  if (nativePlatform) {
    Object.defineProperty(Platform, 'OS', nativePlatform);
  }
});

it('reads the refresh token from the versioned application key', async () => {
  getItemAsync.mockResolvedValue('stored-refresh-value');

  await expect(readRefreshToken()).resolves.toBe('stored-refresh-value');
  expect(getItemAsync).toHaveBeenCalledWith('save.refresh-token.v1');
});

it('writes a non-blank refresh token to the versioned application key', async () => {
  await writeRefreshToken('new-refresh-value');

  expect(setItemAsync).toHaveBeenCalledWith('save.refresh-token.v1', 'new-refresh-value');
});

it.each(['', ' ', '\n\t'])('rejects a blank refresh token without writing it', async token => {
  await expect(writeRefreshToken(token)).rejects.toThrow('Refresh token must not be blank');
  expect(setItemAsync).not.toHaveBeenCalled();
});

it('deletes the refresh token from the versioned application key', async () => {
  await clearRefreshToken();

  expect(deleteItemAsync).toHaveBeenCalledWith('save.refresh-token.v1');
});

it('does not call SecureStore while reading a session on web', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

  await expect(readRefreshToken()).resolves.toBeNull();
  expect(getItemAsync).not.toHaveBeenCalled();
});

it('does not persist or delete refresh tokens through SecureStore on web', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

  await writeRefreshToken('web-refresh-value');
  await clearRefreshToken();
  expect(setItemAsync).not.toHaveBeenCalled();
  expect(deleteItemAsync).not.toHaveBeenCalled();
});
