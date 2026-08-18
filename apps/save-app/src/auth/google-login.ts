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
  prompt: () => Promise<void>;
};

const platformClientId = Platform.select({
  android: runtime.googleAndroidClientId,
  ios: runtime.googleIosClientId,
  default: runtime.googleWebClientId,
});

export function useGoogleLogin(): GoogleLogin {
  const enabled = Boolean(platformClientId);
  const loginWithGoogleToken = useAuthStore(state => state.loginWithGoogleToken);
  const processedToken = useRef<string | null>(null);
  const [prompting, setPrompting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: runtime.googleAndroidClientId || undefined,
    clientId: platformClientId || 'disabled.apps.googleusercontent.com',
    iosClientId: runtime.googleIosClientId || undefined,
    language: 'ko',
    selectAccount: true,
    webClientId: runtime.googleWebClientId || undefined,
  });

  useEffect(() => {
    const idToken =
      response?.type === 'success'
        ? response.authentication?.idToken || response.params.id_token
        : undefined;

    if (!idToken || processedToken.current === idToken) {
      return;
    }

    processedToken.current = idToken;
    setSubmitting(true);
    void loginWithGoogleToken(idToken)
      .catch(() => undefined)
      .finally(() => setSubmitting(false));
  }, [loginWithGoogleToken, response]);

  const prompt = useCallback(async () => {
    if (!enabled || !request || prompting || submitting) {
      return;
    }

    setPrompting(true);
    try {
      await promptAsync();
    } finally {
      setPrompting(false);
    }
  }, [enabled, promptAsync, prompting, request, submitting]);

  return { enabled, busy: prompting || submitting, prompt };
}
