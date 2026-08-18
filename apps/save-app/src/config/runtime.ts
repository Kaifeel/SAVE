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

export function readRuntime(env: PublicEnvironment, dev: boolean): RuntimeConfig {
  const values = {
    EXPO_PUBLIC_API_BASE_URL: (env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '').replace(/\/$/, ''),
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
);
