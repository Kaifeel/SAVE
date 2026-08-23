import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '@/auth/store';
import { ItemComposeForm } from '@/catalog/components/item-compose-form';
import { useItemComposer } from '@/catalog/use-item-composer';
import type { ItemPhotoAsset } from '@/catalog/types';

function fallbackFileName(uri: string, index: number): string {
  const candidate = uri.split('/').pop();
  return candidate?.trim() || `photo-${index + 1}.jpg`;
}

export default function CreateScreen() {
  const router = useRouter();
  const universityId = useAuthStore(state => state.user?.universityId);
  const composer = useItemComposer(universityId);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const addPhotos = async () => {
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
    });
    if (result.canceled) {
      return;
    }

    const photos: ItemPhotoAsset[] = result.assets.map((asset, index) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? fallbackFileName(asset.uri, index),
      mimeType: asset.mimeType ?? 'image/jpeg',
    }));
    composer.addPhotos(photos);
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
      onAddPhotos={() => { void addPhotos(); }}
      onSubmit={() => { void submit(); }}
    />
  );
}
