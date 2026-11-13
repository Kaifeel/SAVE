import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { ItemPhotoAsset } from './types';

type JpegResult = {
  uri: string;
  width: number;
  height: number;
};

type ConvertToJpeg = (uri: string) => Promise<JpegResult>;

const convertWithExpo: ConvertToJpeg = uri => manipulateAsync(uri, [], {
  compress: 0.85,
  format: SaveFormat.JPEG,
});

export async function normalizeImageAssets(
  assets: ImagePickerAsset[],
  limit: number,
  convertToJpeg: ConvertToJpeg = convertWithExpo,
): Promise<ItemPhotoAsset[]> {
  const selected = assets.slice(0, Math.max(0, limit));
  return Promise.all(selected.map(async (asset, index) => {
    const normalized = await convertToJpeg(asset.uri);
    return {
      uri: normalized.uri,
      fileName: `normalized-${index + 1}.jpg`,
      mimeType: 'image/jpeg',
    };
  }));
}
