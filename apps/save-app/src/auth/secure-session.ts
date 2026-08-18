import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'save.refresh-token.v1';

export function readRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return Promise.resolve(null);
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function writeRefreshToken(refreshToken: string): Promise<void> {
  if (!refreshToken.trim()) {
    return Promise.reject(new Error('Refresh token must not be blank'));
  }

  if (Platform.OS === 'web') {
    return Promise.resolve();
  }

  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
