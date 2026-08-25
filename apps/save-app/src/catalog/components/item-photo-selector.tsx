import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';
import type { ItemPhotoAsset } from '../types';

type Props = {
  photos: ItemPhotoAsset[];
  notice: string | null;
  disabled: boolean;
  onChoosePhotos: () => void;
  onTakePhoto: () => void;
  onOpenSettings: () => void;
  onRemove: (uri: string) => void;
};

export function ItemPhotoSelector({
  photos,
  notice,
  disabled,
  onChoosePhotos,
  onTakePhoto,
  onOpenSettings,
  onRemove,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.label}>사진 (선택)</Text>
        <Text style={styles.count}>{photos.length}/5</Text>
      </View>
      <View style={styles.addRow}>
        <PhotoButton disabled={disabled || photos.length >= 5} icon="◎" label="카메라 촬영" onPress={onTakePhoto} />
        <PhotoButton disabled={disabled || photos.length >= 5} icon="▧" label="갤러리 선택" onPress={onChoosePhotos} />
      </View>

      {notice ? (
        <View style={styles.noticeRow}>
          <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="사진 권한 설정 열기" onPress={onOpenSettings}>
            <Text style={styles.settings}>설정 열기</Text>
          </Pressable>
        </View>
      ) : null}

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {photos.map(photo => (
            <View key={photo.uri} style={styles.photoCard}>
              <Image
                accessibilityLabel={`선택한 사진 ${photo.fileName}`}
                source={{ uri: photo.uri }}
                style={styles.photo}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${photo.fileName} 삭제`}
                disabled={disabled}
                onPress={() => onRemove(photo.uri)}
                style={styles.removeButton}
              >
                <Text style={styles.removeLabel}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function PhotoButton({ disabled, icon, label, onPress }: {
  disabled: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.addButton, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={styles.addIcon}>{icon}</Text>
      <Text style={styles.addLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.colors.textSoft, fontSize: 13, fontWeight: '700' },
  count: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 10 },
  addButton: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: 16,
    backgroundColor: theme.colors.canvas,
  },
  addIcon: { color: theme.colors.primary, fontSize: 24, lineHeight: 26 },
  addLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  noticeRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  notice: { color: theme.colors.warning, flex: 1, fontSize: 12, lineHeight: 18 },
  settings: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  photos: { gap: 10, paddingVertical: 2 },
  photoCard: { width: 96, height: 96, position: 'relative' },
  photo: { width: 96, height: 96, borderRadius: 14, backgroundColor: theme.colors.canvas },
  removeButton: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  removeLabel: { color: '#ffffff', fontSize: 18, lineHeight: 20 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
