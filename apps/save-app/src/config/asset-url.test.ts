import { resolveAssetUrl } from './asset-url';

it('resolves an upload path against the physical-device API origin', () => {
  expect(resolveAssetUrl(
    '/uploads/items/photo.png',
    'http://192.168.0.10:8080/api/v1',
  )).toBe('http://192.168.0.10:8080/uploads/items/photo.png');
});

it('keeps absolute and device-local image URLs unchanged', () => {
  expect(resolveAssetUrl('https://cdn.example/photo.png', 'http://api.test/api/v1'))
    .toBe('https://cdn.example/photo.png');
  expect(resolveAssetUrl('file:///selected.jpg', 'http://api.test/api/v1'))
    .toBe('file:///selected.jpg');
});

it('rewrites backend loopback upload URLs to the physical-device API host', () => {
  expect(resolveAssetUrl(
    'http://localhost:8080/uploads/items/photo.png',
    'http://192.168.0.10:8080/api/v1',
  )).toBe('http://192.168.0.10:8080/uploads/items/photo.png');
});
