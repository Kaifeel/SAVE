import { create } from 'zustand';

import {
  ApiError,
  login,
  loginWithGoogle,
  logout as revokeSession,
  refresh,
  signup,
} from './api';
import { clearRefreshToken, readRefreshToken, writeRefreshToken } from './secure-session';
import type { AuthUser, LoginInput, MobileSession, SignupInput } from './types';

type AuthStatus = 'hydrating' | 'authenticated' | 'unauthenticated' | 'offline';

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
  loginWithEmail: (input: LoginInput) => Promise<void>;
  signupWithEmail: (input: SignupInput) => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<void>;
  refreshAccessToken: () => Promise<string>;
  logout: () => Promise<void>;
};

let refreshInFlight: Promise<string> | null = null;

export const useAuthStore = create<AuthState>(set => {
  const exposeSession = async (session: MobileSession): Promise<string> => {
    await writeRefreshToken(session.refreshToken);
    set({
      status: 'authenticated',
      accessToken: session.accessToken,
      user: session.user,
    });
    return session.accessToken;
  };

  const refreshAccessToken = (knownRefreshToken?: string): Promise<string> => {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      const refreshToken = knownRefreshToken ?? (await readRefreshToken());

      if (!refreshToken) {
        set({ status: 'unauthenticated', accessToken: null, user: null });
        throw new Error('No refresh token is available');
      }

      try {
        return await exposeSession(await refresh(refreshToken));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            await clearRefreshToken();
          } finally {
            set({ status: 'unauthenticated', accessToken: null, user: null });
          }
        } else {
          set({ status: 'offline', accessToken: null, user: null });
        }

        throw error;
      }
    })().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  };

  const authenticate = async (request: Promise<MobileSession>): Promise<void> => {
    await exposeSession(await request);
  };

  const bootstrap = async (): Promise<void> => {
    set({ status: 'hydrating', accessToken: null, user: null });
    const refreshToken = await readRefreshToken();

    if (!refreshToken) {
      set({ status: 'unauthenticated', accessToken: null, user: null });
      return;
    }

    try {
      await refreshAccessToken(refreshToken);
    } catch {
      // refreshAccessToken deterministically records unauthorized and offline outcomes.
    }
  };

  return {
    status: 'hydrating',
    accessToken: null,
    user: null,
    bootstrap,
    retryBootstrap: bootstrap,
    loginWithEmail: input => authenticate(login(input)),
    signupWithEmail: input => authenticate(signup(input)),
    loginWithGoogleToken: idToken => authenticate(loginWithGoogle(idToken)),
    refreshAccessToken: () => refreshAccessToken(),
    logout: async () => {
      try {
        const refreshToken = await readRefreshToken();
        if (refreshToken) {
          await revokeSession(refreshToken);
        }
      } finally {
        try {
          await clearRefreshToken();
        } finally {
          set({ status: 'unauthenticated', accessToken: null, user: null });
        }
      }
    },
  };
});
