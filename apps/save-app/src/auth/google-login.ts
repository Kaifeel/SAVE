import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isSuccessResponse,
} from 'react-native-nitro-google-signin';
import { useCallback, useEffect, useRef, useState } from 'react';

import { runtime } from '@/config/runtime';

import { useAuthStore } from './store';

export type GoogleLogin = {
  enabled: boolean;
  busy: boolean;
  error: string | null;
  prompt: () => Promise<void>;
};

const enabled = Boolean(runtime.googleWebClientId);

export function useGoogleLogin(): GoogleLogin {
  const loginWithGoogleToken = useAuthStore(state => state.loginWithGoogleToken);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    GoogleOneTapSignIn.configure({
      webClientId: runtime.googleWebClientId,
      ...(runtime.googleIosClientId ? { iosClientId: runtime.googleIosClientId } : {}),
    });
  }, []);

  const submitToken = useCallback(async (idToken: string) => {
    setError(null);
    try {
      await loginWithGoogleToken(idToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.message
          ? requestError.message
          : 'Google 로그인에 실패했습니다.',
      );
    }
  }, [loginWithGoogleToken]);

  const prompt = useCallback(async () => {
    if (!enabled || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);

    try {
      await GoogleOneTapSignIn.checkPlayServices();
      const response = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isCancelledResponse(response)) {
        return;
      }
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error('Google 로그인 토큰을 받지 못했습니다.');
      }

      await submitToken(response.data.idToken);
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.message
          ? requestError.message
          : 'Google 로그인에 실패했습니다.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [submitToken]);

  return { enabled, busy, error, prompt };
}
