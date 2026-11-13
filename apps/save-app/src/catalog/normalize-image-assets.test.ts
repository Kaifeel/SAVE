import type { ImagePickerAsset } from 'expo-image-picker';

import { normalizeImageAssets } from './normalize-image-assets';

const heicAsset = {
  uri: 'file:///camera/IMG_0001.HEIC',
  fileName: null,
  mimeType: 'image/heic',
  width: 3024,
  height: 4032,
  type: 'image',
} as ImagePickerAsset;

it('converts a non-JPEG picker asset into a real JPEG upload asset', async () => {
  const convertToJpeg = jest.fn().mockResolvedValue({
    uri: 'file:///cache/normalized-a1b2.jpg',
    width: 1512,
    height: 2016,
  });

  await expect(normalizeImageAssets([heicAsset], 5, convertToJpeg)).resolves.toEqual([{
    uri: 'file:///cache/normalized-a1b2.jpg',
    fileName: 'normalized-1.jpg',
    mimeType: 'image/jpeg',
  }]);
  expect(convertToJpeg).toHaveBeenCalledWith('file:///camera/IMG_0001.HEIC');
});

it('keeps picker order and respects the remaining photo limit', async () => {
  const assets = [1, 2, 3].map(index => ({
    ...heicAsset,
    uri: `file:///camera/${index}.avif`,
  }));
  const convertToJpeg = jest.fn(async (uri: string) => ({
    uri: uri.replace('/camera/', '/cache/').replace('.avif', '.jpg'),
    width: 100,
    height: 100,
  }));

  const normalized = await normalizeImageAssets(assets, 2, convertToJpeg);

  expect(normalized.map(photo => photo.uri)).toEqual([
    'file:///cache/1.jpg',
    'file:///cache/2.jpg',
  ]);
  expect(convertToJpeg).toHaveBeenCalledTimes(2);
});
