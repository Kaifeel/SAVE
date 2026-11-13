import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';

import { useAuthStore } from '@/auth/store';
import { ItemComposeForm } from '@/catalog/components/item-compose-form';
import { normalizeImageAssets } from '@/catalog/normalize-image-assets';
import { useItemComposer } from '@/catalog/use-item-composer';

const NORMALIZATION_ERROR = '사진을 JPEG로 변환하지 못했습니다. 다른 사진을 선택해 주세요.';

export default function CreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ itemId?: string | string[] }>();
  const rawItemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const parsedItemId = rawItemId ? Number(rawItemId) : Number.NaN;
  const itemId = Number.isInteger(parsedItemId) && parsedItemId > 0 ? parsedItemId : null;
  const universityId = useAuthStore(state => state.user?.universityId);
  const composer = useItemComposer(universityId, itemId);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const appendAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const remaining = Math.max(0, 5 - composer.draft.photos.length);
    try {
      const photos = await normalizeImageAssets(assets, remaining);
      composer.addPhotos(photos);
    } catch {
      setPermissionNotice(NORMALIZATION_ERROR);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void ImagePicker.getPendingResultAsync().then(result => {
      if (result && 'canceled' in result && !result.canceled && result.assets) {
        void appendAssets(result.assets);
      }
    }).catch(() => undefined);
  // Android exposes a one-shot system result only when this screen mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choosePhotos = async () => {
    setPermissionNotice(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionNotice('사진 없이도 물품을 등록할 수 있습니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 5 - composer.draft.photos.length),
      quality: 0.8,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled) {
      return;
    }

    await appendAssets(result.assets);
  };

  const takePhoto = async () => {
    setPermissionNotice(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPermissionNotice('카메라 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) await appendAssets(result.assets);
  };

  const submit = async () => {
    const item = await composer.submit();
    if (item) {
      router.replace({
        pathname: '/items/[id]',
        params: { id: String(item.id) },
      });
    }
  };

  return (
    <ItemComposeForm
      composer={composer}
      permissionNotice={permissionNotice}
      onChoosePhotos={() => { void choosePhotos(); }}
      onTakePhoto={() => { void takePhoto(); }}
      onOpenPhotoSettings={() => { void Linking.openSettings(); }}
      onSubmit={() => { void submit(); }}
    />
  );
}
