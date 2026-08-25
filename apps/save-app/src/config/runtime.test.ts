import { readRuntime } from './runtime';

const configured = {
  EXPO_PUBLIC_API_BASE_URL: 'https://api.save.example/api/v1/',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'android.apps.googleusercontent.com',
};

it('normalizes a configured production runtime', () => {
  expect(readRuntime(configured, false)).toMatchObject({
    apiBaseUrl: 'https://api.save.example/api/v1',
    mockEnabled: false,
  });
});

it.each([
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
])('rejects production when %s is absent', key =>
  expect(() => readRuntime({ ...configured, [key]: '' }, false)).toThrow(key),
);

it('rejects production when the API URL normalizes to empty', () => {
  expect(() => readRuntime({ ...configured, EXPO_PUBLIC_API_BASE_URL: '/' }, false)).toThrow(
    'EXPO_PUBLIC_API_BASE_URL',
  );
});

it('rejects mock mode in production', () => {
  expect(() => readRuntime({ ...configured, EXPO_PUBLIC_API_MODE: 'mock' }, false)).toThrow('mock');
});

it('derives the development API URL from the Expo LAN host when none is configured', () => {
  expect(readRuntime({}, true, '192.168.0.24:8081')).toMatchObject({
    apiBaseUrl: 'http://192.168.0.24:8080/api/v1',
  });
});

it('keeps an explicitly configured development API URL', () => {
  expect(readRuntime({ EXPO_PUBLIC_API_BASE_URL: 'https://dev-api.save.test/api/v1/' }, true, '192.168.0.24:8081'))
    .toMatchObject({ apiBaseUrl: 'https://dev-api.save.test/api/v1' });
});

it('does not derive a backend URL from a public Expo tunnel host', () => {
  expect(readRuntime({}, true, 'example.exp.direct:443')).toMatchObject({ apiBaseUrl: '' });
});
