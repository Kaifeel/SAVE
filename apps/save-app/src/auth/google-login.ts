import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { runtime } from '@/config/runtime';

import { useAuthStore } from './store';

WebBrowser.maybeCompleteAuthSession();

export type GoogleLogin = {
  enabled: boolean;
  busy: boolean;
  error: string | null;
  prompt: () => Promise<void>;
};

type GoogleClientIds = Pick<
  typeof runtime,
  'googleAndroidClientId' | 'googleIosClientId' | 'googleWebClientId'
>;

export function selectGoogleClientId(platform: string, clientIds: GoogleClientIds): string {
  if (platform === 'android') {
    return clientIds.googleAndroidClientId;
  }
  if (platform === 'ios') {
    return clientIds.googleIosClientId;
  }
  return clientIds.googleWebClientId;
}

const platformClientId = selectGoogleClientId(Platform.OS, runtime);

export function useGoogleLogin(): GoogleLogin {
  const enabled = Boolean(platformClientId);
  const loginWithGoogleToken = useAuthStore(state => state.loginWithGoogleToken);
  const attemptedToken = useRef<string | null>(null);
  const processedToken = useRef<string | null>(null);
  const retryToken = useRef<string | null>(null);
  const [prompting, setPrompting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: runtime.googleAndroidClientId || undefined,
    clientId: platformClientId || 'disabled.apps.googleusercontent.com',
    iosClientId: runtime.googleIosClientId || undefined,
    language: 'ko',
    selectAccount: true,
    webClientId: runtime.googleWebClientId || undefined,
  });

  const submitToken = useCallback(async (idToken: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogleToken(idToken);
      processedToken.current = idToken;
      retryToken.current = null;
    } catch (requestError) {
      retryToken.current = idToken;
      setError(
        requestError instanceof Error && requestError.message
          ? requestError.message
          : 'Google 로그인에 실패했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [loginWithGoogleToken]);

  useEffect(() => {
    const idToken =
      response?.type === 'success'
        ? response.authentication?.idToken || response.params.id_token
        : undefined;

    if (
      !idToken ||
      attemptedToken.current === idToken ||
      processedToken.current === idToken
    ) {
      return;
    }

    attemptedToken.current = idToken;
    void submitToken(idToken);
  }, [response, submitToken]);

  const prompt = useCallback(async () => {
    if (prompting || submitting) {
      return;
    }

    if (retryToken.current) {
      await submitToken(retryToken.current);
      return;
    }

    if (!enabled || !request) {
      return;
    }

    setError(null);
    setPrompting(true);
    try {
      await promptAsync();
    } finally {
      setPrompting(false);
    }
  }, [enabled, promptAsync, prompting, request, submitToken, submitting]);

  return { enabled, busy: prompting || submitting, error, prompt };
}
