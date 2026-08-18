import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'save.refresh-token.v1';

export function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function writeRefreshToken(refreshToken: string): Promise<void> {
  if (!refreshToken.trim()) {
    return Promise.reject(new Error('Refresh token must not be blank'));
  }

  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
