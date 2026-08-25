import Constants from 'expo-constants';

export interface PublicEnvironment {
  EXPO_PUBLIC_API_BASE_URL?: string;
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
  EXPO_PUBLIC_API_MODE?: string;
}

export interface RuntimeConfig {
  apiBaseUrl: string;
  googleWebClientId: string;
  googleIosClientId: string;
  googleAndroidClientId: string;
  mockEnabled: boolean;
}

const requiredProductionFields = [
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
] as const;

function developmentApiBaseUrl(hostUri?: string): string {
  if (!hostUri?.trim()) return '';
  try {
    const url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
    const host = url.hostname.toLowerCase();
    const privateIpv4 = /^10\./.test(host)
      || /^192\.168\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    return privateIpv4 || local ? `http://${host}:8080/api/v1` : '';
  } catch {
    return '';
  }
}

export function readRuntime(
  env: PublicEnvironment,
  dev: boolean,
  developmentHostUri?: string,
): RuntimeConfig {
  const configuredApiBaseUrl = (env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '').replace(/\/$/, '');
  const values = {
    EXPO_PUBLIC_API_BASE_URL: configuredApiBaseUrl
      || (dev ? developmentApiBaseUrl(developmentHostUri) : ''),
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '',
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '',
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '',
  };
  const mockRequested = env.EXPO_PUBLIC_API_MODE?.trim() === 'mock';

  if (!dev) {
    const missingFields = requiredProductionFields.filter(field => !values[field]);
    const errors = [
      ...(missingFields.length > 0
        ? [`Missing required runtime configuration: ${missingFields.join(', ')}`]
        : []),
      ...(mockRequested ? ['EXPO_PUBLIC_API_MODE=mock is not allowed in production'] : []),
    ];

    if (errors.length > 0) {
      throw new Error(errors.join('. '));
    }
  }

  return {
    apiBaseUrl: values.EXPO_PUBLIC_API_BASE_URL,
    googleWebClientId: values.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: values.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    googleAndroidClientId: values.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    mockEnabled: dev && mockRequested,
  };
}

export const runtime = readRuntime(
  {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    EXPO_PUBLIC_API_MODE: process.env.EXPO_PUBLIC_API_MODE,
  },
  __DEV__,
  Constants.expoConfig?.hostUri,
);
