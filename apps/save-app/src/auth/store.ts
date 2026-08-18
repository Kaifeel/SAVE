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
let sessionGeneration = 0;
let sessionMutationQueue: Promise<void> = Promise.resolve();

function serializeSessionMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = sessionMutationQueue.then(operation);
  sessionMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function assertCurrentSession(generation: number): void {
  if (generation !== sessionGeneration) {
    throw new Error('Session operation was superseded');
  }
}

export const useAuthStore = create<AuthState>(set => {
  const exposeSession = (session: MobileSession, generation: number): Promise<string> => {
    assertCurrentSession(generation);

    return serializeSessionMutation(async () => {
      assertCurrentSession(generation);
      await writeRefreshToken(session.refreshToken);
      assertCurrentSession(generation);
      set({
        status: 'authenticated',
        accessToken: session.accessToken,
        user: session.user,
      });
      return session.accessToken;
    });
  };

  const refreshAccessToken = (
    knownRefreshToken?: string,
    generation = sessionGeneration,
  ): Promise<string> => {
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
        return await exposeSession(await refresh(refreshToken), generation);
      } catch (error) {
        assertCurrentSession(generation);

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

  const authenticate = async (
    request: Promise<MobileSession>,
    generation: number,
  ): Promise<void> => {
    await exposeSession(await request, generation);
  };

  const bootstrap = async (): Promise<void> => {
    const generation = sessionGeneration;
    set({ status: 'hydrating', accessToken: null, user: null });
    const refreshToken = await readRefreshToken();

    if (!refreshToken) {
      set({ status: 'unauthenticated', accessToken: null, user: null });
      return;
    }

    try {
      await refreshAccessToken(refreshToken, generation);
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
    loginWithEmail: input => {
      const generation = sessionGeneration;
      return authenticate(login(input), generation);
    },
    signupWithEmail: input => {
      const generation = sessionGeneration;
      return authenticate(signup(input), generation);
    },
    loginWithGoogleToken: idToken => {
      const generation = sessionGeneration;
      return authenticate(loginWithGoogle(idToken), generation);
    },
    refreshAccessToken: () => refreshAccessToken(),
    logout: () => {
      sessionGeneration += 1;

      return serializeSessionMutation(async () => {
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
      });
    },
  };
});
