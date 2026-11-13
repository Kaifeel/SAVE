import type { ConfigContext, ExpoConfig } from 'expo/config';

const withFreshAutolinkingCache = require('./plugins/fresh-autolinking-cache.cjs');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'save-app',
  slug: config.slug ?? 'save-app',
  plugins: [
    ...(config.plugins ?? []),
    '@react-native-community/datetimepicker',
    withFreshAutolinkingCache,
  ],
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
});
